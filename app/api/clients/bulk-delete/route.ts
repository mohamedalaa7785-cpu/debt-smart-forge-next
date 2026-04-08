import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const ids: string[] = body.ids;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "No client IDs provided" },
          { status: 400 }
        );
      }

      /* 🔐 SECURITY (optional strict check later) */

      await db.delete(clients).where(inArray(clients.id, ids));

      await logAction(user.id, "BULK_DELETE_CLIENTS", {
        count: ids.length,
      });

      return NextResponse.json({
        success: true,
        deleted: ids.length,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || "Delete failed" },
        { status: 500 }
      );
    }
  });
}
