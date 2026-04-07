import { NextRequest, NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import { canAccessClient, getClientById } from "@/server/services/client.service";

const rateMap = new Map<string, { count: number; time: number }>();

function rateLimit(key: string, limit = 10) {
  const now = Date.now();
  const data = rateMap.get(key) || { count: 0, time: now };

  if (now - data.time > 60000) {
    data.count = 0;
    data.time = now;
  }

  data.count++;

  rateMap.set(key, data);

  if (data.count > limit) {
    throw new Error("Too many requests");
  }
}

function validate(body: any) {
  if (!body.name && !body.phone) {
    return "Name or phone required";
  }
  return null;
}

function sanitize(body: any) {
  return {
    clientId: body.clientId || null,
    name: body.name?.trim() || null,
    phone: body.phone?.trim() || null,
    company: body.company?.trim() || null,
    city: body.city?.trim() || null,
    imageUrl: body.imageUrl || null,
  };
}

async function saveResult(clientId: string, result: any) {
  try {
    const existing = await db.query.osintResults.findFirst({
      where: eq(osintResults.clientId, clientId),
    });

    const payload = {
      summary: result.summary || null,
      confidenceScore: result.confidence || 0,
      social: result.socialLinks || [],
      workplace: result.workplace || [],
      webResults: result.webResults || [],
      imageResults: result.imageMatches || [],
    };

    if (existing) {
      await db.update(osintResults).set(payload).where(eq(osintResults.clientId, clientId));
      return;
    }

    await db.insert(osintResults).values({ clientId, ...payload });
  } catch (error) {
    console.error("SAVE OSINT ERROR:", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    rateLimit(`${user.id}:${ip}`);

    const body = await req.json();
    const error = validate(body);

    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const clean = sanitize(body);

    if (clean.clientId) {
      const client = await getClientById(clean.clientId);
      if (!client || !canAccessClient(client, user.id, user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    let result = null;

    try {
      result = await runOSINT({
        name: clean.name,
        phone: clean.phone,
        company: clean.company,
        city: clean.city,
        imageUrl: clean.imageUrl,
      });
    } catch (err) {
      console.error("OSINT ENGINE ERROR:", err);
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: "OSINT temporarily unavailable" },
        { status: 503 }
      );
    }

    if (clean.clientId) {
      await saveResult(clean.clientId, result);
    }

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        confidence: result.confidence || 0,
        hasImage: !!clean.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("OSINT ERROR:", error);
    if (error.message === "Too many requests") {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "OSINT failed" },
      { status }
    );
  }
}
