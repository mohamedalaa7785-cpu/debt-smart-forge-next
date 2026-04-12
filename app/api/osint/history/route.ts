export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { osintHistory } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";

export async function GET(req: NextRequest) {
  try {
    /* 🔐 AUTH */
    await requireUser();

    /* 📥 PARAMS */
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId is required" },
        { status: 400 }
      );
    }

    /* 📊 LIMIT (pagination ready) */
    const limit = Number(searchParams.get("limit") || 10);

    /* 🔍 QUERY */
    const history = await db
      .select()
      .from(osintHistory)
      .where(eq(osintHistory.clientId, clientId))
      .orderBy(desc(osintHistory.createdAt))
      .limit(limit);

    /* ✅ RESPONSE */
    return NextResponse.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error("OSINT HISTORY ERROR:", error);

    const status =
      error?.message === "Unauthorized" ||
      error?.message === "Invalid session"
        ? 401
        : 500;

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to fetch history",
      },
      { status }
    );
  }
}
