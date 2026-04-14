import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ensureUsersTableColumns, isMissingUsersColumnError } from "@/server/lib/users-schema";
import { APP_ROLES, type AppRole, normalizeRole } from "@/server/lib/role";

export type AuthRole = AppRole;

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  name?: string | null;
  isSuperUser?: boolean;
}

function fail(message: string, status = 401) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }

  return { url, key };
}

function getSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, key } = getEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookieValues) => {
        cookieValues.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });
}

export async function requireUser(): Promise<AuthUser> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Invalid session");
  }

  if (!user.email) {
    throw new Error("User email missing");
  }

  let dbUser: typeof users.$inferSelect | undefined;

  try {
    dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
  } catch (lookupError) {
    if (!isMissingUsersColumnError(lookupError)) throw lookupError;
    await ensureUsersTableColumns();
    dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
  }

  if (!dbUser) {
    throw new Error("User record not synced");
  }

  const role: AuthRole = dbUser.isSuperUser
    ? "hidden_admin"
    : normalizeRole(dbUser.role);

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
    throw new Error("Forbidden");
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
  } catch (error: any) {
    const message = error?.message || "Unauthorized";
    const status = message === "User record not synced" ? 500 : 401;
    return fail(message, status);
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
  } catch (error: any) {
    const message = error?.message || "Forbidden";
    const status = message === "Forbidden" ? 403 : message === "User record not synced" ? 500 : 401;
    return fail(message, status);
  }
}
