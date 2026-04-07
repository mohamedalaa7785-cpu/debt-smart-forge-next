import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser, requireRole } from "@/server/lib/auth";
import bcrypt from "bcryptjs";

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
  try {
    const user = await requireUser(req);
    requireRole(user, ["hidden_admin"]);

    const allUsers = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users);

    return NextResponse.json({ success: true, data: allUsers });
  } catch (error: any) {
    const status = error?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: error?.message || "Unauthorized" }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    requireRole(user, ["hidden_admin"]);

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const name = body?.name ? String(body.name).trim() : null;
    const password = String(body?.password || "");
    const role = String(body?.role || "collector").trim();

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ success: false, error: "password must be at least 6 chars" }, { status: 400 });
    }

    if (!isAllowedRole(role)) {
      return NextResponse.json({ success: false, error: "invalid role" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      return NextResponse.json({ success: false, error: "email already exists" }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const [created] = await db
      .insert(users)
      .values({ email, name, password: hash, role })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    const status = error?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: error?.message || "Unauthorized" }, { status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    requireRole(user, ["hidden_admin"]);

    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const name = body?.name === undefined ? undefined : String(body.name).trim();
    const role = body?.role === undefined ? undefined : String(body.role).trim();
    const password = body?.password === undefined ? undefined : String(body.password);

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) {
      return NextResponse.json({ success: false, error: "user not found" }, { status: 404 });
    }

    const payload: any = {};
    if (name !== undefined) payload.name = name || null;

    if (role !== undefined) {
      if (!isAllowedRole(role)) {
        return NextResponse.json({ success: false, error: "invalid role" }, { status: 400 });
      }

      if (target.role === "hidden_admin" && role !== "hidden_admin") {
        const count = await hiddenAdminCount();
        if (count <= 1) {
          return NextResponse.json({ success: false, error: "at least one hidden_admin must remain" }, { status: 400 });
        }
      }

      payload.role = role;
    }

    if (password !== undefined) {
      if (password.length < 6) {
        return NextResponse.json({ success: false, error: "password must be at least 6 chars" }, { status: 400 });
      }
      payload.password = await bcrypt.hash(password, 10);
    }

    if (!Object.keys(payload).length) {
      return NextResponse.json({ success: false, error: "no updatable fields supplied" }, { status: 400 });
    }

    const [updated] = await db
      .update(users)
      .set(payload)
      .where(eq(users.id, userId))
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    const status = error?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: error?.message || "Unauthorized" }, { status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    requireRole(user, ["hidden_admin"]);

    const body = await req.json();
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const target = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!target) {
      return NextResponse.json({ success: false, error: "user not found" }, { status: 404 });
    }

    if (target.role === "hidden_admin") {
      const count = await hiddenAdminCount();
      if (count <= 1) {
        return NextResponse.json({ success: false, error: "cannot delete the last hidden_admin" }, { status: 400 });
      }
    }

    await db.delete(users).where(eq(users.id, userId));
    return NextResponse.json({ success: true, data: { deletedUserId: userId } });
  } catch (error: any) {
    const status = error?.message === "Forbidden" ? 403 : 401;
    return NextResponse.json({ success: false, error: error?.message || "Unauthorized" }, { status });
  }
}
