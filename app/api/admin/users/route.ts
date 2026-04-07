// file: app/api/admin/users/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { withRole } from "@/server/lib/auth";
import { createClient } from "@supabase/supabase-js";

/* =========================
   ENV SAFETY 🔥
========================= */
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing SUPABASE URL");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SERVICE ROLE KEY");
}

/* =========================
   ADMIN CLIENT 🔐
========================= */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* =========================
   ROLES
========================= */
const ALLOWED_ROLES = ["admin", "supervisor", "team_leader", "collector", "hidden_admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string): role is AllowedRole {
  return ALLOWED_ROLES.includes(role as AllowedRole);
}

/* =========================
   HELPERS
========================= */
async function hiddenAdminCount() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "hidden_admin"));

  return rows[0]?.count || 0;
}

/* =========================
   GET USERS
========================= */
export async function GET(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
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

/* =========================
   CREATE USER 🔥
========================= */
export async function POST(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    const { email, password, name, role } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
    }

    /* CREATE AUTH USER */
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(name && { name }),
        ...(role && { role }),
      },
    });

    if (error) throw error;

    /* UPDATE DB (trigger already created row) */
    const [created] = await db
      .update(users)
      .set({
        role,
        ...(name && { name }),
      })
      .where(eq(users.id, data.user.id))
      .returning();

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  });
}

/* =========================
   UPDATE USER
========================= */
export async function PATCH(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    const { userId, role, name, password } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const target = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    /* SAFETY */
    if (target.role === "hidden_admin" && role !== "hidden_admin") {
      const count = await hiddenAdminCount();
      if (count <= 1) {
        return NextResponse.json({ success: false, error: "Cannot remove last hidden_admin" }, { status: 400 });
      }
    }

    /* UPDATE AUTH */
    const updateData: any = {
      user_metadata: {
        ...(name && { name }),
        ...(role && { role }),
      },
    };

    if (password) updateData.password = password;

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
    if (error) throw error;

    /* UPDATE DB */
    const [updated] = await db
      .update(users)
      .set({
        ...(role && { role }),
        ...(name !== undefined && { name: name || null }),
      })
      .where(eq(users.id, userId))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  });
}

/* =========================
   DELETE USER
========================= */
export async function DELETE(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId required" }, { status: 400 });
    }

    const target = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (target.role === "hidden_admin") {
      const count = await hiddenAdminCount();
      if (count <= 1) {
        return NextResponse.json({ success: false, error: "Cannot delete last hidden_admin" }, { status: 400 });
      }
    }

    /* DELETE AUTH */
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    /* DELETE DB */
    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      data: { deletedUserId: userId },
    });
  });
                                }
