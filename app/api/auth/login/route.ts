// app/api/auth/login/route.ts

export const dynamic = "force-dynamic";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }

  return { url, key };
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const response = NextResponse.json({ success: true }); // placeholder

    const { url, key } = getEnv();

    const supabase = createServerClient(url, key, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string) {
          response.cookies.delete(name);
        },
      },
    });

    /* =========================
       LOGIN
    ========================= */
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

    /* =========================
       USER SYNC
    ========================= */
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id),
    });

    if (!dbUser) {
      await db
        .insert(users)
        .values({
          id: data.user.id,
          email: data.user.email!,
          role: "collector",
          name: data.user.user_metadata?.name || null,
        })
        .onConflictDoNothing();

      dbUser = await db.query.users.findFirst({
        where: eq(users.id, data.user.id),
      });
    }

    if (!dbUser) {
      throw new Error("User record not synced");
    }

    /* =========================
       LOG
    ========================= */
    await logAction(dbUser.id, "LOGIN", { email });

    /* =========================
       FINAL RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
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
