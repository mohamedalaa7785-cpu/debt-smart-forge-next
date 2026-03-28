import { NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   RATE LIMIT 🔥
========================= */
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

/* =========================
   VALIDATION
========================= */
function validate(body: any) {
  if (!body.name && !body.phone) {
    return "Name or phone required";
  }
  return null;
}

/* =========================
   SANITIZE
========================= */
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

/* =========================
   SAVE RESULT 🔥
========================= */
async function saveResult(clientId: string, result: any) {
  const existing = await db.query.osintResults.findFirst({
    where: eq(osintResults.clientId, clientId),
  });

  const payload = {
    summary: result.summary,
    confidenceScore: result.confidence,
    socialLinks: JSON.stringify(result.socialLinks || []),
    workplace: JSON.stringify(result.workplace || []),
    webResults: JSON.stringify(result.webResults || []),
    imageResults: JSON.stringify(result.imageMatches || []),
  };

  if (existing) {
    await db
      .update(osintResults)
      .set(payload)
      .where(eq(osintResults.clientId, clientId));
    return;
  }

  await db.insert(osintResults).values({
    clientId,
    ...payload,
  });
}

/* =========================
   POST OSINT 🔥
========================= */
export async function POST(req: Request) {
  try {
    /* =========================
       RATE LIMIT
    ========================= */
    const ip =
      req.headers.get("x-forwarded-for") || "unknown";

    rateLimit(ip);

    const body = await req.json();

    /* =========================
       VALIDATION
    ========================= */
    const error = validate(body);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    const clean = sanitize(body);

    /* =========================
       RUN OSINT
    ========================= */
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

    /* =========================
       FALLBACK
    ========================= */
    if (!result) {
      return NextResponse.json({
        success: false,
        error: "OSINT temporarily unavailable",
      });
    }

    /* =========================
       SAVE TO DB
    ========================= */
    if (clean.clientId) {
      await saveResult(clean.clientId, result);
    }

    /* =========================
       RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      data: result,

      meta: {
        confidence: result.confidence,
        hasImage: !!clean.imageUrl,
      },
    });
  } catch (error: any) {
    console.error("OSINT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "OSINT failed",
      },
      { status: 500 }
    );
  }
       }
