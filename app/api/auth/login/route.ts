// file: app/api/auth/login/route.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: CookieOptions) =>
            cookieStore.set({ name, value, ...options }),
          remove: (name: string, options: CookieOptions) =>
            cookieStore.set({ name, value: "", ...options }),
        },
      }
    );

    /* =========================
       LOGIN 🔐
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
       SESSION CHECK
    ========================= */
    const { data: sessionCheck } = await supabase.auth.getSession();

    if (!sessionCheck.session) {
      return NextResponse.json(
        { success: false, error: "Session not persisted" },
        { status: 500 }
      );
    }

    /* =========================
       GET USER FROM DB 🔥
    ========================= */
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, data.user.id),
    });

    // ❌ لو مش موجود → ده bug في sync
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not synced with database",
        },
        { status: 500 }
      );
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
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
                                                  }
