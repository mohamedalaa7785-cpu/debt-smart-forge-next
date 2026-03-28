import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { desc } from "drizzle-orm";

import { requireUser } from "@/server/lib/auth";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";

/* =========================
   GET CLIENTS (SECURE)
========================= */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req as any);

    const { limit, offset } = getPagination(req);

    const data = await db
      .select()
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(limit)
      .offset(offset);

    await logAction(user.id, "GET_CLIENTS");

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
