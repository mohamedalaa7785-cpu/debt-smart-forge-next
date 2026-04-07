// file: app/api/auth/login/route.ts

export const dynamic = "force-dynamic";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";

/* =========================
   ENV CHECK 🔥
========================= */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE URL");
}

if (!supabaseKey) {
  throw new Error("Missing SUPABASE ANON KEY");
}

/* =========================
   LOGIN API 🔐
========================= */
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

    /* =========================
       SUPABASE CLIENT
    ========================= */
    const supabase = createServerClient(
      supabaseUrl as string,
      supabaseKey as string,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) => {
            cookieStore.set({ name, value, ...options });
          },
          remove: (name: string, options: CookieOptions) => {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

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
       SESSION VALIDATION
    ========================= */
    const { data: sessionCheck } = await supabase.auth.getSession();

    if (!sessionCheck.session) {
      return NextResponse.json(
        { success: false, error: "Session not persisted" },
        { status: 500 }
      );
    }

    /* =========================
       GET USER FROM DB
    ========================= */
    let dbUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id),
    });

    /* 🔥 AUTO SYNC */
    if (!dbUser) {
      const inserted = await db
        .insert(users)
        .values({
          id: data.user.id,
          email: data.user.email!,
          role: "collector",
          name: data.user.user_metadata?.name || null,
        })
        .returning();

      dbUser = inserted[0];
    }

    /* =========================
       LOG
    ========================= */
    await logAction(dbUser.id, "LOGIN", { email });

    /* =========================
       RESPONSE
    ========================= */
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          name: dbUser.name,
        },
        session: data.session,
      },
    });
  } catch (err: any) {
    console.error("LOGIN ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
       }
