export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { resolveRoleByEmail, isSuperUserEmail } from "@/server/lib/role";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.toLowerCase().trim();
    const password = body.password;
    const name = body.name;

    // ✅ validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set({ name, value, ...options });
            });
          },
        },
      }
    );

    /* =========================
       SIGNUP (Supabase Auth)
    ========================= */

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // 🔥 أهم check (كان ناقص عندك)
    if (!data.user || !data.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: "User not created properly",
        },
        { status: 500 }
      );
    }

    /* =========================
       INSERT INTO users TABLE
    ========================= */

    try {
      await db
        .insert(users)
        .values({
          id: data.user.id,
          email: data.user.email!,
          name: name || null,
          role: resolveRoleByEmail(email),
          isSuperUser: isSuperUserEmail(email),
        })
        .onConflictDoNothing(); // 🔥 يمنع الكراش
    } catch (dbError: any) {
      console.error("DB ERROR:", dbError.message);
      // ❌ متكسرش signup بسبب DB
    }

    /* =========================
       SUCCESS
    ========================= */

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });
  } catch (err: any) {
    console.error("SIGNUP ERROR:", err.message);

    return NextResponse.json(
      {
        success: false,
        error: err.message || "Signup failed",
      },
      { status: 500 }
    );
  }
      }
