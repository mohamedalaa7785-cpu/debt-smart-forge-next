import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import {
  getClientById,
  canAccessClient,
} from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";

/* =========================
   GET CLIENT
========================= */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    try {
      const client = await getClientById(
        params.id,
        user.id,
        user.role
      );

      if (!client) {
        return NextResponse.json(
          { success: false, error: "Not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: client,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/* =========================
   UPDATE CLIENT
========================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();

      const existing = await db.query.clients.findFirst({
        where: eq(clients.id, params.id),
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 }
        );
      }

      if (!canAccessClient(existing, user.id, user.role)) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      const updated = await db
        .update(clients)
        .set({
          name: body.name ?? existing.name,
          email: body.email ?? existing.email,
          company: body.company ?? existing.company,
          notes: body.notes ?? existing.notes,
          branch: body.branch ?? existing.branch,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, params.id))
        .returning();

      await logAction(user.id, "UPDATE_CLIENT", {
        clientId: params.id,
      });

      return NextResponse.json({
        success: true,
        data: updated[0],
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
}

/* =========================
   DELETE CLIENT
========================= */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(async (user) => {
    try {
      const existing = await db.query.clients.findFirst({
        where: eq(clients.id, params.id),
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 }
        );
      }

      /* 🔐 ONLY ADMIN */
      if (
        user.role !== "admin" &&
        user.role !== "hidden_admin"
      ) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
        );
      }

      await db.delete(clients).where(eq(clients.id, params.id));

      await logAction(user.id, "DELETE_CLIENT", {
        clientId: params.id,
      });

      return NextResponse.json({
        success: true,
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  });
        }
