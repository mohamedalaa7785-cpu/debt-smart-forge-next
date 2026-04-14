import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runOSINT } from "@/server/services/osint.service";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { logger } from "@/server/lib/logger";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { handleApiError, ForbiddenError, ValidationError } from "@/server/core/error.handler";

const OsintRequestSchema = z
  .object({
    clientId: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1).max(200).optional().nullable(),
    phone: z.string().trim().min(6).max(32).optional().nullable(),
    company: z.string().trim().max(200).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
  })
  .strict()
  .refine((v) => Boolean(v.name || v.phone || v.clientId), "Name or phone or clientId required");

async function getCached(clientId: string, allowStale = false) {
  const existing = await db.query.osintResults.findFirst({ where: eq(osintResults.clientId, clientId) });

  if (!existing) return null;

  const age = Date.now() - new Date(existing.lastAnalyzedAt || 0).getTime();
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

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    await enforceRateLimit(`osint:${user.id}:${ip}:${req.nextUrl.pathname}`, 15, 60);

    const rawBody = await req.json();
    const parsed = OsintRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError("Invalid OSINT payload", {
        issues: parsed.error.issues.map((issue) => issue.message),
      });
    }

    const clean = {
      clientId: parsed.data.clientId || null,
      name: parsed.data.name?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      company: parsed.data.company?.trim() || null,
      city: parsed.data.city?.trim() || null,
      imageUrl: parsed.data.imageUrl || null,
    };

    if (clean.clientId) {
      const client = await getClientById(clean.clientId, user.id, user.role);

      if (!client || !client.id) {
        throw new ForbiddenError();
      }

      const cached = await getCached(clean.clientId);
      if (cached) {
        return NextResponse.json({ success: true, data: cached, meta: { cached: true } });
      }
    }

    let result: any = null;

    try {
      result = await Promise.race([
        runOSINT({
          clientId: clean.clientId || undefined,
          name: clean.name || "",
          phone: clean.phone || undefined,
          company: clean.company || undefined,
          city: clean.city || undefined,
          imageUrl: clean.imageUrl || undefined,
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000)),
      ]);
    } catch (err) {
      logger.error("OSINT_ENGINE_ERROR", { reason: String((err as Error)?.message || "unknown") });
    }

    if (!result && clean.clientId) {
      const stale = await getCached(clean.clientId, true);
      if (stale) {
        return NextResponse.json({ success: true, data: stale, meta: { stale: true } });
      }
    }

    if (!result) {
      return NextResponse.json({ success: false, error: "OSINT unavailable" }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        fraudFlags: result.fraudFlags || [],
        riskLevel: result.riskLevel || "low",
      },
      meta: { hasImage: !!clean.imageUrl, processedAt: new Date() },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
