import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { desc } from "drizzle-orm";

import { requireUser } from "@/server/lib/auth";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";

/* =========================
   RATE LIMIT 🔥
========================= */
const rateMap = new Map<string, { count: number; time: number }>();

function rateLimit(key: string, limit = 30) {
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
   CACHE (LIGHT)
========================= */
const cache = new Map<
  string,
  { data: any; expiry: number }
>();

const TTL = 1000 * 30; // 30 sec

/* =========================
   HELPERS
========================= */
function success(data: any, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function fail(error: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/* =========================
   GET CLIENTS 🔥
========================= */
export async function GET(req: NextRequest) {
  try {
    /* =========================
       RATE LIMIT
    ========================= */
    const ip =
      req.headers.get("x-forwarded-for") || "unknown";

    rateLimit(ip);

    /* =========================
       AUTH
    ========================= */
    const user = await requireUser(req);

    /* =========================
       PAGINATION
    ========================= */
    const { page, limit, offset } = getPagination(req);

    const cacheKey = `${page}-${limit}`;

    /* =========================
       CACHE HIT
    ========================= */
    const cached = cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return success(cached.data, {
        page,
        limit,
        cached: true,
      });
    }

    /* =========================
       FETCH DATA
    ========================= */
    let data: any[] = [];

    try {
      data = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          company: clients.company,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(limit + 1) // 🔥 مهم
        .offset(offset);
    } catch (err) {
      console.error("DB ERROR:", err);
      return fail("Database error", 500);
    }

    /* =========================
       HAS MORE FIX 🔥
    ========================= */
    const hasMore = data.length > limit;

    if (hasMore) {
      data.pop(); // remove extra item
    }

    /* =========================
       LOGGING
    ========================= */
    await logAction(user.id, "GET_CLIENTS", {
      page,
      limit,
    });

    /* =========================
       CACHE SAVE
    ========================= */
    cache.set(cacheKey, {
      data,
      expiry: Date.now() + TTL,
    });

    /* =========================
       RESPONSE
    ========================= */
    return success(data, {
      page,
      limit,
      count: data.length,
      hasMore,
    });
  } catch (error: any) {
    console.error("GET CLIENTS ERROR:", error);

    return fail(
      error?.message || "Unauthorized",
      error?.message === "Too many requests" ? 429 : 401
    );
  }
}
