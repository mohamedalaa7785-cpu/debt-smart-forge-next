export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { withRole } from "@/server/lib/auth";
import { createClient } from "@supabase/supabase-js";
import {
  AdminCreateUserSchema,
  AdminDeleteUserSchema,
  AdminUpdateUserSchema,
} from "@/lib/validators/api";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey);
}

async function hiddenAdminCount() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "hidden_admin"));

  return rows[0]?.count || 0;
}

export async function GET(_req: NextRequest) {
  return withRole(["hidden_admin"], async () => {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users);

    return NextResponse.json({ success: true, data: allUsers });
  });
}

export async function POST(req: NextRequest) {
  return withRole(["hidden_admin"], async () => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Supabase admin env is not configured" }, { status: 500 });
    }

    const rawBody = await req.json();
    const parsed = AdminCreateUserSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid user payload" }, { status: 400 });
    }

    const { email, password, name, role } = parsed.data;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(name && { name }),
        role,
      },
      app_metadata: { role, is_super_user: role === "hidden_admin" },
    });

    if (error) throw error;

    const [created] = await db
      .update(users)
      .set({
        role,
        isSuperUser: role === "hidden_admin",
        ...(name && { name }),
      })
      .where(eq(users.id, data.user.id))
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  });
}

export async function PATCH(req: NextRequest) {
  return withRole(["hidden_admin"], async () => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Supabase admin env is not configured" }, { status: 500 });
    }

    const rawBody = await req.json();
    const parsed = AdminUpdateUserSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid user update payload" }, { status: 400 });
    }

    const { userId, role, name, password } = parsed.data;

    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (target.role === "hidden_admin" && role && role !== "hidden_admin") {
      const count = await hiddenAdminCount();
      if (count <= 1) {
        return NextResponse.json({ success: false, error: "Cannot remove last hidden_admin" }, { status: 400 });
      }
    }

    const updateData: any = {
      user_metadata: {
        ...(name !== undefined ? { name } : {}),
        ...(role ? { role } : {}),
      },
      ...(role ? { app_metadata: { role, is_super_user: role === "hidden_admin" } } : {}),
    };

    if (password) updateData.password = password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
    if (error) throw error;

    const [updated] = await db
      .update(users)
      .set({
        ...(role ? { role, isSuperUser: role === "hidden_admin" } : {}),
        ...(name !== undefined ? { name: name || null } : {}),
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  });
}

export async function DELETE(req: NextRequest) {
  return withRole(["hidden_admin"], async () => {
    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: "Supabase admin env is not configured" }, { status: 500 });
    }

    const rawBody = await req.json();
    const parsed = AdminDeleteUserSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid delete payload" }, { status: 400 });
    }

    const { userId } = parsed.data;
    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });

    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (target.role === "hidden_admin") {
      const count = await hiddenAdminCount();
      if (count <= 1) {
        return NextResponse.json({ success: false, error: "Cannot delete last hidden_admin" }, { status: 400 });
      }
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true, data: { deletedUserId: userId } });
  });
}
