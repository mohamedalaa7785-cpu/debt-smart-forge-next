// server/lib/auth.ts

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
}

function fail(message: string, status = 401) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
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

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser) {
    throw new Error("User record not synced");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as AuthRole,
    name: dbUser.name,
  };
}

export function requireRole(user: AuthUser, roles: AuthRole[]) {
  if (user.role === "hidden_admin") return;

  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

export async function withAuth(
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  try {
    const user = await requireUser();
    return await handler(user);
  } catch (error: any) {
    return fail(error?.message || "Unauthorized", 401);
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
