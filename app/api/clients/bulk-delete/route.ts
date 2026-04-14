import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";
import { BulkIdsBodySchema } from "@/lib/validators/api";
import { canDeleteClients } from "@/server/lib/role";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const parsed = BulkIdsBodySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json({ success: false, error: "Invalid delete payload" }, { status: 400 });
      }

      if (!canDeleteClients(user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const { ids } = parsed.data;
      await db.delete(clients).where(inArray(clients.id, ids));

      await logAction(user.id, "BULK_DELETE_CLIENTS", { count: ids.length });
      return NextResponse.json({ success: true, deleted: ids.length });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message || "Delete failed" }, { status: 500 });
    }
  });
}
