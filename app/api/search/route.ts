import { NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  clients,
  clientPhones,
} from "@/server/db/schema";

import { ilike, or, desc } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

/* =========================
   SANITIZE QUERY
========================= */
function sanitizeQuery(q: string) {
  return q.trim();
}

/* =========================
   BUILD SEARCH CONDITIONS
========================= */
function buildConditions(q: string) {
  const phone = normalizePhone(q);

  return or(
    ilike(clients.name, `%${q}%`),
    ilike(clients.email, `%${q}%`),
    ilike(clients.company, `%${q}%`),
    phone ? ilike(clientPhones.phone, `%${phone}%`) : undefined
  );
}

/* =========================
   SEARCH
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery || rawQuery.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const q = sanitizeQuery(rawQuery);

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
      })
      .from(clients)
      .leftJoin(
        clientPhones,
        (fields, { eq }) =>
          eq(fields.clients.id, fields.clientPhones.clientId)
      )
      .where(buildConditions(q))
      .orderBy(desc(clients.createdAt))
      .limit(25);

    /* =========================
       DEDUPLICATION
    ========================= */
    const unique = Array.from(
      new Map(results.map((r) => [r.id, r])).values()
    );

    /* =========================
       SMART RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      count: unique.length,
      data: unique,
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
