export const dynamic = "force-dynamic";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";

/* ---------------- ENV ---------------- */

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }

  return { url, key };
}

/* ---------------- ROLE FALLBACK ---------------- */

function resolveRole(email: string) {
  const e = email.toLowerCase();

  if (e.includes("adel")) return "admin";
  if (e.includes("loai")) return "supervisor";
  if (e.includes("mostafa") || e.includes("heba"))
    return "team_leader";

  return "collector";
}

function isSuperUser(email: string) {
  return email.toLowerCase().includes("mohamed");
}

/* ---------------- MAIN ---------------- */

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const { url, key } = getEnv();

    const response = NextResponse.next();

    const supabase = createServerClient(url, key, {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          response.cookies.set({ name, value, ...options }),
        remove: (name: string) => response.cookies.delete(name),
      },
    });

    /* ---------------- LOGIN ---------------- */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message || "Invalid credentials" },
        { status: 401 }
      );
    }

    /* ---------------- DB SYNC ---------------- */
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id),
    });

    if (!dbUser) {
      await db
        .insert(users)
        .values({
          id: data.user.id,
          email: data.user.email!,
          role: resolveRole(email),
          name: data.user.user_metadata?.name || null,
          is_super_user: isSuperUser(email),
        })
        .onConflictDoNothing();

      dbUser = await db.query.users.findFirst({
        where: eq(users.id, data.user.id),
      });
    }

    if (!dbUser) {
      throw new Error("User record not synced");
    }

    /* ---------------- LOG ---------------- */
    await logAction(dbUser.id, "LOGIN", { email });

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        is_super_user: dbUser.is_super_user,
      },
    });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
