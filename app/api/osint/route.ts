import { NextRequest, NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import {
  canAccessClient,
  getClientById,
} from "@/server/services/client.service";

/* ---------------- RATE LIMIT ---------------- */

const rateMap = new Map<string, { count: number; time: number }>();

function rateLimit(key: string, limit = 15) {
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

/* ---------------- VALIDATION ---------------- */

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

/* ---------------- CACHE ---------------- */

async function getCached(clientId: string) {
  const existing = await db.query.osintResults.findFirst({
    where: eq(osintResults.clientId, clientId),
  });

  if (!existing) return null;

  const isFresh = Date.now() - new Date(existing.updatedAt).getTime() < 1000 * 60 * 60; // 1 hour

  if (!isFresh) return null;

  return existing;
}

/* ---------------- SAVE ---------------- */

async function saveResult(clientId: string, result: any) {
  try {
    const payload = {
      summary: result.summary || null,
      confidenceScore: result.confidence || 0,
      social: result.socialLinks || [],
      workplace: result.workplace || [],
      webResults: result.webResults || [],
      imageResults: result.imageMatches || [],
      updatedAt: new Date(),
    };

    await db
      .insert(osintResults)
      .values({ clientId, ...payload })
      .onConflictDoUpdate({
        target: osintResults.clientId,
        set: payload,
      });
  } catch (error) {
    console.error("SAVE OSINT ERROR:", error);
  }
}

/* ---------------- SCORING ---------------- */

function calculateScore(result: any) {
  let score = 0;

  if (result.webResults?.length) score += 20;
  if (result.socialLinks?.length) score += 25;
  if (result.workplace?.length) score += 15;
  if (result.imageMatches?.length) score += 20;

  if (result.summary?.includes("fraud")) score += 20;

  return Math.min(score, 100);
}

/* ---------------- MAIN ---------------- */

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    rateLimit(`${user.id}:${ip}`);

    const body = await req.json();
    const error = validate(body);

    if (error) {
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    const clean = sanitize(body);

    /* -------- ACCESS CONTROL -------- */
    if (clean.clientId) {
      const client = await getClientById(clean.clientId);

      if (!client || !canAccessClient(client, user.id, user.role)) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      /* -------- CACHE CHECK -------- */
      const cached = await getCached(clean.clientId);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          meta: { cached: true },
        });
      }
    }

    /* -------- RUN ENGINE -------- */
    let result = null;

    try {
      result = await Promise.race([
        runOSINT({
          name: clean.name,
          phone: clean.phone,
          company: clean.company,
          city: clean.city,
          imageUrl: clean.imageUrl,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 15000)
        ),
      ]);
    } catch (err) {
      console.error("OSINT ENGINE ERROR:", err);
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: "OSINT unavailable" },
        { status: 503 }
      );
    }

    /* -------- SCORING -------- */
    const score = calculateScore(result);

    /* -------- SAVE -------- */
    if (clean.clientId) {
      await saveResult(clean.clientId, {
        ...result,
        confidence: score,
      });
    }

    /* -------- RESPONSE -------- */
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        confidence: score,
      },
      meta: {
        hasImage: !!clean.imageUrl,
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    console.error("OSINT ERROR:", error);

    if (error.message === "Too many requests") {
      return NextResponse.json(
        { success: false, error: "Too many requests" },
        { status: 429 }
      );
    }

    const status =
      error?.message === "Unauthorized" ||
      error?.message === "Invalid session"
        ? 401
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: error.message || "OSINT failed",
      },
      { status }
    );
  }
}
