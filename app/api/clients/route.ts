import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";

import { requireUser } from "@/server/lib/auth";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";
import { createClientFull, getClientsForUser } from "@/server/services/client.service";

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

    const cacheKey = `${user.id}-${user.role}-${page}-${limit}`;

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
    const scopedClients = await getClientsForUser(user.id, user.role);
    const sortedClients = scopedClients
      .slice()
      .sort((a, b) => (new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime()));
    const data = sortedClients
      .slice(offset, offset + limit + 1)
      .map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        createdAt: client.createdAt,
      }));

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

/* =========================
   POST CLIENTS (CREATE) 🔥
========================= */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();

    const { name, email, company, phones, addresses, loans, imageUrl, osintData } = body;

    if (!name) {
      return fail("Name is required");
    }

    if (!phones || phones.length === 0) {
      return fail("At least one phone is required");
    }

    if (!loans || loans.length === 0) {
      return fail("At least one loan is required");
    }

    const newClient = await createClientFull(
      {
        name,
        email: email || null,
        company: company || null,
        imageUrl: imageUrl || null,
        phones,
        addresses,
        loans,
      },
      user.id
    );
    const clientId = newClient.id;

    // Save OSINT data if available
    if (osintData) {
      await db.insert(osintResults).values({
        clientId,
        social: osintData.socialLinks || [],
        workplace: osintData.workplace || [],
        webResults: osintData.webResults || [],
        imageResults: osintData.imageMatches || [],
        summary: osintData.summary,
        confidenceScore: osintData.confidence || 0,
      });
    }

    await logAction(user.id, "CREATE_CLIENT", { clientId, name });

    return success({ id: clientId, name });
  } catch (error: any) {
    console.error("POST CLIENTS ERROR:", error);
    return fail(error?.message || "Failed to create client", 500);
  }
}
