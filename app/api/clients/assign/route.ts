import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, users } from "@/server/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";
import { AssignClientsBodySchema } from "@/lib/validators/api";
import { canAssignClients } from "@/server/lib/role";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const parsed = AssignClientsBodySchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError("Invalid assign payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      if (!canAssignClients(user.role)) {
        throw new ForbiddenError();
      }

      const { ids, ownerId } = parsed.data;

      const owner = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
      if (!owner) {
        throw new ValidationError("Owner user does not exist");
      }

      if (!["collector", "team_leader", "admin", "hidden_admin"].includes(owner.role)) {
        throw new ValidationError("Owner role is not assignable");
      }

      await db.transaction(async (tx) => {
        await tx.update(clients).set({ ownerId }).where(inArray(clients.id, ids));

        if (owner.role === "team_leader") {
          await tx
            .update(clients)
            .set({ teamLeaderId: ownerId })
            .where(and(inArray(clients.id, ids), eq(clients.ownerId, ownerId)));
        }
      });

      await logAction(user.id, "ASSIGN_CLIENTS", {
        count: ids.length,
        assignedTo: ownerId,
      });

      return NextResponse.json({ success: true, updated: ids.length });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
