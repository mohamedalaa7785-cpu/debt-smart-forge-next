import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";
import { AssignClientsBodySchema } from "@/lib/validators/api";
import { canAssignClients } from "@/server/lib/role";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const parsed = AssignClientsBodySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "Invalid assign payload" }, { status: 400 });
      }

      if (!canAssignClients(user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const { ids, ownerId } = parsed.data;

      await db.update(clients).set({ ownerId }).where(inArray(clients.id, ids));

      await logAction(user.id, "ASSIGN_CLIENTS", {
        count: ids.length,
        assignedTo: ownerId,
      });

      return NextResponse.json({
        success: true,
        updated: ids.length,
      });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message || "Assign failed" }, { status: 500 });
    }
  });
}
