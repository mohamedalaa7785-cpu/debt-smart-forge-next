import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { desc } from "drizzle-orm";

import { requireUser } from "@/server/lib/auth";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";

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
   GET CLIENTS (SECURE + PAGINATION)
========================= */
export async function GET(req: NextRequest) {
  try {
    /* =========================
       AUTH 🔐
    ========================= */
    const user = await requireUser(req);

    /* =========================
       PAGINATION
    ========================= */
    const { page, limit, offset } = getPagination(req);

    /* =========================
       FETCH DATA
    ========================= */
    const data = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        company: clients.company,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);

    /* =========================
       LOGGING 📊
    ========================= */
    await logAction(user.id, "GET_CLIENTS", {
      page,
      limit,
    });

    /* =========================
       RESPONSE
    ========================= */
    return success(data, {
      page,
      limit,
      count: data.length,
      hasMore: data.length === limit,
    });
  } catch (error: any) {
    console.error("GET CLIENTS ERROR:", error);

    return fail(
      error?.message || "Unauthorized",
      401
    );
  }
}
