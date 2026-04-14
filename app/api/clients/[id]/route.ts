import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getClientById, canAccessClient } from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";
import { handleApiError, ForbiddenError, ValidationError } from "@/server/core/error.handler";
import { UpdateClientBodySchema } from "@/lib/validators/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (user) => {
    try {
      const client = await getClientById(params.id, user.id, user.role);

      if (!client) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: client });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (user) => {
    try {
      const rawBody = await req.json();
      const parsed = UpdateClientBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new ValidationError("Invalid update payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const existing = await db.query.clients.findFirst({ where: eq(clients.id, params.id) });

      if (!existing) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }

      if (!canAccessClient(existing, user.id, user.role)) {
        throw new ForbiddenError();
      }

      const [updated] = await db
        .update(clients)
        .set({
          ...parsed.data,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, params.id))
        .returning();

      await logAction(user.id, "UPDATE_CLIENT", {
        clientId: params.id,
      });

      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(async (user) => {
    try {
      const existing = await db.query.clients.findFirst({ where: eq(clients.id, params.id) });

      if (!existing) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }

      if (user.role !== "admin" && user.role !== "hidden_admin") {
        throw new ForbiddenError();
      }

      await db.delete(clients).where(eq(clients.id, params.id));

      await logAction(user.id, "DELETE_CLIENT", {
        clientId: params.id,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
