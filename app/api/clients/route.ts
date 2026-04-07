import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, clientLoans, osintResults } from "@/server/db/schema";
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

    // Create client
    const clientResult = await db
      .insert(clients)
      .values({
        name,
        email: email || null,
        company: company || null,
        imageUrl: imageUrl || null,
      })
      .returning();

    const clientId = clientResult[0].id;

    // Create phones
    if (phones && phones.length > 0) {
      await db.insert(clientPhones).values(
        phones.map((phone: string) => ({
          clientId,
          phone,
        }))
      );
    }

    // Create addresses
    if (addresses && addresses.length > 0) {
      await db.insert(clientAddresses).values(
        addresses.map((address: any, index: number) => ({
          clientId,
          address: address.address || address,
          city: address.city,
          area: address.area,
          lat: address.lat?.toString(),
          lng: address.lng?.toString(),
          isPrimary: index === 0,
        }))
      );
    }

    // Create loans
    if (loans && loans.length > 0) {
      await db.insert(clientLoans).values(
        loans.map((loan: any) => ({
          clientId,
          loanType: loan.loanType,
          balance: loan.balance?.toString(),
          overdue: loan.overdue?.toString(),
          emi: loan.emi?.toString(),
          amountDue: loan.amountDue?.toString(),
          bucket: loan.bucket || 1,
          penaltyEnabled: loan.penaltyEnabled || false,
          penaltyAmount: loan.penaltyAmount?.toString() || "0"
        }))
      );
    }

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
