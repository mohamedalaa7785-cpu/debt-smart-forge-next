export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";
import { ensureUsersTableColumns } from "@/server/lib/users-schema";
import { isSuperUserEmail, resolveRoleByEmail } from "@/server/lib/role";
import { RegisterBodySchema } from "@/lib/validators/api";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

function getDisplayName(name?: string, email?: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return email?.split("@")[0] ?? "User";
}

function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
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

function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return null;

  const { url } = getSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function syncUserRecord(params: {
  id: string;
  email: string;
  name: string;
  role: ReturnType<typeof resolveRoleByEmail>;
  isSuperUser: boolean;
}) {
  await ensureUsersTableColumns();

  const payload = {
    id: params.id,
    email: params.email,
    name: params.name,
    role: params.role,
    isSuperUser: params.isSuperUser,
  };

  const updatedById = await db
    .update(users)
    .set({
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isSuperUser: payload.isSuperUser,
    })
    .where(eq(users.id, payload.id))
    .returning();

  if (updatedById[0]) return updatedById[0];

  try {
    const inserted = await db.insert(users).values(payload).returning();
    if (inserted[0]) return inserted[0];
  } catch {
    await db
      .update(users)
      .set({
        id: payload.id,
        name: payload.name,
        role: payload.role,
        isSuperUser: payload.isSuperUser,
      })
      .where(eq(users.email, payload.email));
  }

  return db.query.users.findFirst({ where: eq(users.id, payload.id) });
}

export async function POST(req: Request) {
  try {
    if (!hasSupabaseEnv()) {
      return NextResponse.json(
        { success: false, error: "Supabase environment is not configured" },
        { status: 500 }
      );
    }

    const rawBody = (await req.json()) as RegisterBody;
    const parsed = RegisterBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid registration payload" },
        { status: 400 }
      );
    }
    const email = parsed.data.email.toLowerCase();
    const password = parsed.data.password;
    const name = getDisplayName(parsed.data.name, email);

    const role = resolveRoleByEmail(email);
    const isSuperUser = isSuperUserEmail(email);

    const supabase = createSupabaseServerClient();
    const adminClient = createServiceRoleClient();

    let userId: string | null = null;
    let hasSession = false;

    if (adminClient) {
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { role, is_super_user: isSuperUser },
      });

      if (error || !data.user) {
        const message = error?.message?.toLowerCase() ?? "signup failed";
        const isDuplicate =
          message.includes("already") || message.includes("duplicate");

        return NextResponse.json(
          {
            success: false,
            error: isDuplicate
              ? "Email already registered"
              : error?.message ?? "Signup failed",
          },
          { status: isDuplicate ? 409 : 400 }
        );
      }

      userId = data.user.id;

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (!signInError && signInData.session) {
        hasSession = true;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });

      if (error || !data.user) {
        const message = error?.message?.toLowerCase() ?? "signup failed";
        const isDuplicate = message.includes("already");

        return NextResponse.json(
          {
            success: false,
            error: isDuplicate
              ? "Email already registered"
              : error?.message ?? "Signup failed",
          },
          { status: isDuplicate ? 409 : 400 }
        );
      }

      userId = data.user.id;
      hasSession = Boolean(data.session);
    }

    if (!userId) {
      throw new Error("Unable to create user");
    }

    const syncedUser = await syncUserRecord({
      id: userId,
      email,
      name,
      role,
      isSuperUser,
    });

    return NextResponse.json({
      success: true,
      user: syncedUser
        ? {
            id: syncedUser.id,
            email: syncedUser.email,
            name: syncedUser.name,
            role: syncedUser.role,
            is_super_user: Boolean(syncedUser.isSuperUser),
          }
        : { id: userId, email, name, role, is_super_user: isSuperUser },
      emailConfirmationRequired: !hasSession,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
