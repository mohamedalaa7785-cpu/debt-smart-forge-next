import { NextRequest, NextResponse } from "next/server";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { logger } from "@/server/lib/logger";

/* ================= RATE LIMIT ================= */

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

/* ================= VALIDATION ================= */

function validate(body: any) {
  if (!body.name && !body.phone && !body.clientId) {
    return "Name or phone or clientId required";
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

/* ================= CACHE ================= */

async function getCached(clientId: string, allowStale = false) {
  const existing = await db.query.osintResults.findFirst({
    where: eq(osintResults.clientId, clientId),
  });

  if (!existing) return null;

  const age =
    Date.now() - new Date(existing.lastAnalyzedAt || 0).getTime();

  const isFresh = age < 1000 * 60 * 60;

  if (!isFresh && !allowStale) return null;

  return {
    socialLinks: existing.social || [],
    webResults: existing.webResults || [],
    workplace: existing.workplace || [],
    imageMatches: existing.imageResults || [],
    mapsResults: existing.mapsResults || [],
    summary: existing.summary,
    confidence: existing.confidenceScore,
    fraudFlags: existing.fraudFlags || [],
    riskLevel: existing.riskLevel || "low",
  };
}

/* ================= MAIN ================= */

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    rateLimit(`${user.id}:${ip}:${req.nextUrl.pathname}`);

    const body = await req.json();

    const error = validate(body);
    if (error) {
      logger.warn("OSINT_VALIDATION_FAILED", { body });
      return NextResponse.json(
        { success: false, error },
        { status: 400 }
      );
    }

    const clean = sanitize(body);

    logger.info("OSINT_REQUEST", {
      userId: user.id,
      input: clean,
    });

    /* ================= ACCESS ================= */

    if (clean.clientId) {
      const client = await getClientById(
        clean.clientId,
        user.id,
        user.role
      );

      if (!client || !client.id) {
        logger.warn("OSINT_FORBIDDEN", {
          userId: user.id,
          clientId: clean.clientId,
        });

        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      /* 🔥 CACHE */
      const cached = await getCached(clean.clientId);

      if (cached) {
        logger.info("OSINT_CACHE_HIT", {
          clientId: clean.clientId,
        });

        return NextResponse.json({
          success: true,
          data: cached,
          meta: { cached: true },
        });
      }
    }

    /* ================= RUN ENGINE ================= */

    let result: any = null;

    try {
      result = await Promise.race([
        runOSINT({
          clientId: clean.clientId || undefined,
          name: clean.name || "",
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
      logger.error("OSINT_ENGINE_ERROR", {
        error: err,
        input: clean,
      });
    }

    /* 🔥 FALLBACK */
    if (!result && clean.clientId) {
      const stale = await getCached(clean.clientId, true);

      if (stale) {
        logger.warn("OSINT_STALE_FALLBACK", {
          clientId: clean.clientId,
        });

        return NextResponse.json({
          success: true,
          data: stale,
          meta: { stale: true },
        });
      }
    }

    if (!result) {
      logger.error("OSINT_FAILED", {
        input: clean,
      });

      return NextResponse.json(
        { success: false, error: "OSINT unavailable" },
        { status: 503 }
      );
    }

    /* ================= SUCCESS ================= */

    logger.info("OSINT_SUCCESS", {
      clientId: clean.clientId,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        fraudFlags: result.fraudFlags || [],
        riskLevel: result.riskLevel || "low",
      },
      meta: {
        hasImage: !!clean.imageUrl,
        processedAt: new Date(),
      },
    });
  } catch (error: any) {
    logger.error("OSINT_FATAL_ERROR", {
      error,
    });

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
