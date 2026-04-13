export const dynamic = "force-dynamic";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logAction } from "@/server/services/log.service";
import { ensureUsersTableColumns } from "@/server/lib/users-schema";
import { isSuperUserEmail, resolveRoleByEmail } from "@/server/lib/role";
import { LoginBodySchema } from "@/lib/validators/api";

/* ---------------- ENV ---------------- */

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase env not configured");
  }

  return { url, key };
}

function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return "***";
  if (name.length <= 2) return `**@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

/* ---------------- MAIN ---------------- */

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = LoginBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Valid email and password are required" },
        { status: 400 }
      );
    }
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;

    const cookieStore = cookies();
    const { url, key } = getEnv();

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookieValues) => {
          cookieValues.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    });

    /* ---------------- LOGIN ---------------- */
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      const message = (error?.message || "Invalid credentials").toLowerCase();
      const isUnconfirmed = message.includes("email not confirmed");

      return NextResponse.json(
        {
          success: false,
          error: isUnconfirmed
            ? "Email is not confirmed yet. Please verify your email or ask admin to auto-confirm users."
            : error?.message || "Invalid login credentials",
        },
        { status: isUnconfirmed ? 403 : 401 }
      );
    }

    await ensureUsersTableColumns();

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
          role: resolveRoleByEmail(email),
          name: data.user.user_metadata?.name || null,
          isSuperUser: isSuperUserEmail(email),
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
    await logAction(dbUser.id, "LOGIN", { email: maskEmail(email) });

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        is_super_user: dbUser.isSuperUser,
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
