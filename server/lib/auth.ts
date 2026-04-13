import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ensureUsersTableColumns, isMissingUsersColumnError } from "@/server/lib/users-schema";

/* ================= TYPES ================= */

export type AuthRole =
  | "admin"
  | "supervisor"
  | "team_leader"
  | "collector"
  | "hidden_admin";

export interface AuthUser {
  id: string;
  email: string;
  role: AuthRole;
  name?: string | null;
  isSuperUser?: boolean;
}

/* ================= CACHE (SAFE) ================= */

const userCache = new Map<string, { data: AuthUser; expiry: number }>();
const TTL = 1000 * 30;

/* 🔥 cleanup every minute */
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of userCache.entries()) {
    if (val.expiry < now) {
      userCache.delete(key);
    }
  }
}, 60000);

/* ================= HELPERS ================= */

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

function isAuthBypassEnabled() {
  return process.env.AUTH_BYPASS !== "false";
}

async function getBypassUser(): Promise<AuthUser> {
  await ensureUsersTableColumns();

  const hiddenAdmin = await db.query.users.findFirst({
    where: eq(users.role, "hidden_admin"),
  });
  const admin = hiddenAdmin
    ? null
    : await db.query.users.findFirst({
        where: eq(users.role, "admin"),
      });
  const fallback =
    hiddenAdmin ||
    admin ||
    (await db.query.users.findFirst());

  if (!fallback) {
    throw new Error("No users available for auth bypass");
  }

  const role: AuthRole = fallback.isSuperUser
    ? "hidden_admin"
    : (fallback.role as AuthRole);

  return {
    id: fallback.id,
    email: fallback.email,
    role,
    name: fallback.name,
    isSuperUser: fallback.isSuperUser ?? false,
  };
}

/* ================= CORE ================= */

export async function requireUser(): Promise<AuthUser> {
  const bypassEnabled = isAuthBypassEnabled();
  let user:
    | {
        id: string;
        email?: string | null;
      }
    | null = null;
  let authError: Error | null = null;

  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    user = authUser;
    authError = error;
  } catch (error) {
    authError = error as Error;
  }

  if (authError || !user) {
    if (bypassEnabled) {
      return getBypassUser();
    }
    throw new Error("Invalid session");
  }

  if (!user.email) {
    throw new Error("User email missing");
  }

  /* ⚡ CACHE */
  const cached = userCache.get(user.id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  let dbUser: typeof users.$inferSelect | undefined;

  try {
    dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
  } catch (error) {
    if (!isMissingUsersColumnError(error)) throw error;
    await ensureUsersTableColumns();
    dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });
  }

  if (!dbUser) {
    throw new Error("User record not synced");
  }

  /* 🔥 hidden admin */
  let role: AuthRole = dbUser.role as AuthRole;
  if (dbUser.isSuperUser) role = "hidden_admin";

  const authUser: AuthUser = {
    id: dbUser.id,
    email: dbUser.email,
    role,
    name: dbUser.name,
    isSuperUser: dbUser.isSuperUser ?? false,
  };

  userCache.set(user.id, {
    data: authUser,
    expiry: Date.now() + TTL,
  });

  return authUser;
}

/* ================= ROLES ================= */

export function requireRole(user: AuthUser, roles: AuthRole[]) {
  if (user.role === "hidden_admin") return;

  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

/* ================= HELPERS ================= */

export function isAdmin(user: AuthUser) {
  return user.role === "admin" || user.role === "hidden_admin";
}

export function isPrivileged(user: AuthUser) {
  return (
    user.role === "hidden_admin" ||
    user.role === "admin" ||
    user.role === "supervisor"
  );
}

/* ================= WRAPPERS ================= */

type AuthHandler = (user: AuthUser) => Promise<NextResponse>;

export async function withAuth(handler: AuthHandler): Promise<NextResponse> {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error: any) {
    const message = error?.message || "Unauthorized";

    const status =
      message === "User record not synced" ? 500 : 401;

    return fail(message, status);
  }
}

export async function withRole(
  roles: AuthRole[],
  handler: (user: AuthUser) => Promise<NextResponse>
) : Promise<NextResponse> {
  try {
    const user = await requireUser();
    requireRole(user, roles);

    return await handler(user);
  } catch (error: any) {
    const message = error?.message || "Forbidden";

    const status =
      message === "Forbidden"
        ? 403
        : message === "User record not synced"
        ? 500
        : 401;

    return fail(message, status);
  }
}
