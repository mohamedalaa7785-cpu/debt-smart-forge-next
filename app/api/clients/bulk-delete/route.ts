import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";
import { BulkIdsBodySchema } from "@/lib/validators/api";
import { canDeleteClients } from "@/server/lib/role";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const parsed = BulkIdsBodySchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError("Invalid delete payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      if (!canDeleteClients(user.role)) {
        throw new ForbiddenError();
      }

      const { ids } = parsed.data;
      await db.delete(clients).where(inArray(clients.id, ids));

      await logAction(user.id, "BULK_DELETE_CLIENTS", { count: ids.length });
      return NextResponse.json({ success: true, deleted: ids.length });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
