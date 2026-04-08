import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
};

function getDisplayName(name?: string, email?: string) {
  const cleanName = name?.trim();
  if (cleanName) return cleanName;
  return email?.split("@")[0] || "User";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const name = getDisplayName(body.name, email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cookieStore = cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Signup failed" },
        { status: 400 }
      );
    }

    const userId = data.user.id;

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          email,
          name,
          role: "collector",
        },
        {
          onConflict: "id",
        }
      );

    if (upsertError) {
      return NextResponse.json(
        {
          error: `Auth user created, but public.users sync failed: ${upsertError.message}`,
        },
        { status: 500 }
      );
    }

    const { data: userRow, error: userRowError } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", userId)
      .single();

    if (userRowError) {
      return NextResponse.json(
        {
          error: `Auth user created, but failed to read synced user row: ${userRowError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: userRow,
        emailConfirmationRequired: !data.session,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected register error" },
      { status: 500 }
    );
  }
  }
