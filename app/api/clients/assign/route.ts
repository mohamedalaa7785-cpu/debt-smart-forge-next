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
      const { ids, userId } = body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "No client IDs provided" },
          { status: 400 }
        );
      }

      if (!userId) {
        return NextResponse.json(
          { success: false, error: "userId is required" },
          { status: 400 }
        );
      }

      /* 🔐 ROLE CHECK */
      if (user.role !== "admin" && user.role !== "hidden_admin") {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      await db
        .update(clients)
        .set({ ownerId: userId })
        .where(inArray(clients.id, ids));

      await logAction(user.id, "ASSIGN_CLIENTS", {
        count: ids.length,
        assignedTo: userId,
      });

      return NextResponse.json({
        success: true,
        updated: ids.length,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || "Assign failed" },
        { status: 500 }
      );
    }
  });
    }
