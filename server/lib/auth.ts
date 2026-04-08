import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

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

/* =========================
   CACHE ⚡
========================= */
const userCache = new Map<string, { data: AuthUser; expiry: number }>();
const TTL = 1000 * 30;

/* =========================
   HELPERS
========================= */

function fail(message: string, status = 401) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
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
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options: any) =>
        cookieStore.set({ name, value, ...options }),
      remove: (name: string) => cookieStore.delete(name),
    },
  });
}

/* =========================
   CORE 🔥
========================= */

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

  /* ⚡ CACHE */
  const cached = userCache.get(user.id);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser) {
    throw new Error("User record not synced");
  }

  /* 🔥 HIDDEN ADMIN LOGIC */
  let role: AuthRole = dbUser.role as AuthRole;

  if (dbUser.isSuperUser) {
    role = "hidden_admin";
  }

  const authUser: AuthUser = {
    id: dbUser.id,
    email: dbUser.email,
    role,
    name: dbUser.name,
    isSuperUser: dbUser.isSuperUser,
  };

  userCache.set(user.id, {
    data: authUser,
    expiry: Date.now() + TTL,
  });

  return authUser;
}

/* =========================
   ROLE SYSTEM 🔐
========================= */

export function requireRole(user: AuthUser, roles: AuthRole[]) {
  if (user.role === "hidden_admin") return;

  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

/* =========================
   ADVANCED CHECKS 🔥
========================= */

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

/* =========================
   WRAPPERS
========================= */

export async function withAuth(
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error: any) {
    const message = error?.message || "Unauthorized";

    const status =
      message === "User record not synced"
        ? 500
        : 401;

    return fail(message, status);
  }
}

export async function withRole(
  roles: AuthRole[],
  handler: (user: AuthUser) => Promise<NextResponse>
) {
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
