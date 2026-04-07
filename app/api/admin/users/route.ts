import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { withRole } from "@/server/lib/auth";
import { createClient } from "@supabase/supabase-js";

// Supabase Admin Client (using Service Role Key for administrative tasks)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_ROLES = ["admin", "supervisor", "team_leader", "collector", "hidden_admin"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

function isAllowedRole(role: string): role is AllowedRole {
  return ALLOWED_ROLES.includes(role as AllowedRole);
}

async function hiddenAdminCount() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "hidden_admin"));
  return rows[0]?.count || 0;
}

export async function GET(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    try {
      const allUsers = await db
        .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
        .from(users);
      return NextResponse.json({ success: true, data: allUsers });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}

export async function POST(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    try {
      const body = await req.json();
      const { email, password, name, role } = body;

      if (!email || !password || !role) {
        return NextResponse.json({ success: false, error: "Email, password, and role are required" }, { status: 400 });
      }

      if (!isAllowedRole(role)) {
        return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
      }

      // 1. Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }
      });

      if (authError) throw authError;

      // 2. Update the public.users table (trigger might have already done this, but we ensure role is correct)
      const [created] = await db
        .update(users)
        .set({ role, name })
        .where(eq(users.id, authUser.user.id))
        .returning();

      return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    try {
      const body = await req.json();
      const { userId, role, name, password } = body;

      if (!userId) return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });

      const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

      // Handle role safety
      if (role && target.role === "hidden_admin" && role !== "hidden_admin") {
        const count = await hiddenAdminCount();
        if (count <= 1) return NextResponse.json({ success: false, error: "At least one hidden_admin must remain" }, { status: 400 });
      }

      // 1. Update Supabase Auth
      const updateData: any = { user_metadata: { ...target.name && { name }, ...role && { role } } };
      if (password) updateData.password = password;
      
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData);
      if (authError) throw authError;

      // 2. Update public.users
      const [updated] = await db
        .update(users)
        .set({ 
          ...(role && { role }), 
          ...(name !== undefined && { name: name || null }) 
        })
        .where(eq(users.id, userId))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}

export async function DELETE(req: NextRequest) {
  return withRole(req, ["hidden_admin"], async () => {
    try {
      const body = await req.json();
      const { userId } = body;

      if (!userId) return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });

      const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (!target) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

      if (target.role === "hidden_admin") {
        const count = await hiddenAdminCount();
        if (count <= 1) return NextResponse.json({ success: false, error: "Cannot delete the last hidden_admin" }, { status: 400 });
      }

      // 1. Delete from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      // 2. Delete from public.users (though trigger might handle it)
      await db.delete(users).where(eq(users.id, userId));

      return NextResponse.json({ success: true, data: { deletedUserId: userId } });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}
