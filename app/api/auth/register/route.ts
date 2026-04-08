import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

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

function createSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          cookieStore.set({ name, value, ...options }),
        remove: (name: string, options: CookieOptions) =>
          cookieStore.delete(name),
      },
    }
  );
}

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

    const { error: upsertError } = await supabase.from("users").upsert(
      {
        id: userId,
        email,
        name,
        role: "collector",
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: "User created but sync failed",
        },
        { status: 500 }
      );
    }

    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("id, email, name, role")
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
