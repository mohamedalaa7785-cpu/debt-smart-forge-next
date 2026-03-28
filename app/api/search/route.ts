import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  clients,
  clientPhones,
} from "@/server/db/schema";

import { ilike, or, desc, eq, SQL } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

/* =========================
   SIMPLE CACHE (BEST EFFORT)
========================= */
const cache = new Map<
  string,
  { data: any; expiry: number }
>();

const TTL = 1000 * 60 * 3;

/* =========================
   SANITIZE
========================= */
function sanitizeQuery(q: string) {
  return q.trim().slice(0, 100);
}

/* =========================
   BUILD CONDITIONS
========================= */
function buildConditions(q: string) {
  const phone = normalizePhone(q);

  const conditions: SQL[] = [
    ilike(clients.name, `%${q}%`),
  ];

  if (clients.email) {
    conditions.push(ilike(clients.email, `%${q}%`));
  }
  if (clients.company) {
    conditions.push(ilike(clients.company, `%${q}%`));
  }

  if (phone && phone.length >= 3) {
    conditions.push(
      ilike(clientPhones.phone, `%${phone}%`)
    );
  }

  return or(...conditions);
}

/* =========================
   GET SEARCH
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q");

    /* =========================
       VALIDATION
    ========================= */
    if (!rawQuery || rawQuery.trim().length < 2) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const q = sanitizeQuery(rawQuery);
    const cacheKey = q.toLowerCase();

    /* =========================
       CACHE HIT
    ========================= */
    const cached = cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json({
        success: true,
        cached: true,
        count: cached.data.length,
        data: cached.data,
      });
    }

    /* =========================
       QUERY DB
    ========================= */
    const results = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        company: clients.company,
        createdAt: clients.createdAt,
        phone: clientPhones.phone,
      })
      .from(clients)
      .leftJoin(
        clientPhones,
        eq(clients.id, clientPhones.clientId)
      )
      .where(buildConditions(q))
      .orderBy(desc(clients.createdAt))
      .limit(30);

    /* =========================
       MERGE RESULTS
    ========================= */
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email?: string;
        company?: string;
        createdAt: Date;
        phones: string[];
      }
    >();

    for (const row of results) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          name: row.name,
          email: row.email ?? undefined,
          company: row.company ?? undefined,
          createdAt: row.createdAt || new Date(),
          phones: [],
        });
      }

      if (row.phone) {
        map.get(row.id)!.phones.push(row.phone);
      }
    }

    /* =========================
       FINAL FORMAT
    ========================= */
    const final = Array.from(map.values()).map((c) => ({
      ...c,
      phones: Array.from(new Set(c.phones)),
    }));

    /* =========================
       SMART SORT
    ========================= */
    final.sort((a, b) => {
      const phoneScore =
        b.phones.length - a.phones.length;

      if (phoneScore !== 0) return phoneScore;

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });

    /* =========================
       SAVE CACHE
    ========================= */
    cache.set(cacheKey, {
      data: final,
      expiry: Date.now() + TTL,
    });

    return NextResponse.json({
      success: true,
      cached: false,
      count: final.length,
      data: final,
    });
  } catch (error) {
    console.error("SEARCH ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
      },
      { status: 500 }
    );
  }
}
