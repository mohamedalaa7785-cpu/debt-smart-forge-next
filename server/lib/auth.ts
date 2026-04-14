import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { APP_ROLES, type AppRole, normalizeRole } from "@/server/lib/role";
import { createSupabaseServerClient } from "@/server/auth/session.service";
import { AuthError, ForbiddenError, handleApiError } from "@/server/core/error.handler";

export type AuthRole = AppRole;

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  name?: string | null;
  isSuperUser?: boolean;
}

export async function requireUser(): Promise<AuthUser> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError("Invalid session");
  }

  if (!user.email) {
    throw new AuthError("User email missing");
  }

  const dbUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });

  if (!dbUser) {
    throw new AuthError("User record not synced", 409);
  }

  if (!dbUser.email) {
    throw new AuthError("User email missing in profile", 409);
  }

  const role: AuthRole = dbUser.isSuperUser ? "hidden_admin" : normalizeRole(dbUser.role);

  return {
    id: dbUser.id,
    email: dbUser.email,
    role,
    name: dbUser.name,
    isSuperUser: dbUser.isSuperUser ?? false,
  };
}

export function requireRole(user: AuthUser, roles: AuthRole[]) {
  if (user.role === "hidden_admin") return;
  if (!roles.includes(user.role)) {
    throw new ForbiddenError();
  }
}

export function isAdmin(user: AuthUser) {
  return user.role === "admin" || user.role === "hidden_admin";
}

export function isPrivileged(user: AuthUser) {
  return user.role === "hidden_admin" || user.role === "admin" || user.role === "supervisor";
}

type AuthHandler = (user: AuthUser) => Promise<NextResponse>;

export async function withAuth(handler: AuthHandler): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function withRole(
  roles: AuthRole[],
  handler: (user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const allowed = roles.filter((role): role is AuthRole => APP_ROLES.includes(role));
    const user = await requireUser();
    requireRole(user, allowed);
    return await handler(user);
  } catch (error) {
    return handleApiError(error);
  }
}
