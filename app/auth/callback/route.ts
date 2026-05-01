import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/supabase-env";
import { syncAuthUserToPublicUser } from "@/server/users/user.service";
import { normalizeRole, isSuperUserEmail } from "@/server/lib/role";
import { logger } from "@/server/core/logger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") || "/dashboard";
  const next = requestedNext.startsWith("/") ? requestedNext : "/dashboard";

  if (!code) {
    logger.warn("OAuth callback called without code parameter");
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Missing OAuth code")}`, url.origin));
  }

  try {
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
      logger.error("OAuth code exchange failed", { error: error.message });
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const email = user.email.toLowerCase().trim();
      const hidden = isSuperUserEmail(email);
      
      try {
        await syncAuthUserToPublicUser({
          id: user.id,
          email,
          name: (user.user_metadata?.name as string | undefined) || email.split("@")[0] || "User",
          username: (user.user_metadata?.username as string | undefined) || null,
          role: hidden ? "hidden_admin" : normalizeRole(user.app_metadata?.role),
          isSuperUser: hidden || Boolean(user.app_metadata?.is_super_user),
        });
        logger.info("User synced to public.users", { userId: user.id, email });
      } catch (syncError) {
        logger.error("Failed to sync user to public.users", {
          userId: user.id,
          email,
          error: String((syncError as Error)?.message || syncError),
        });
        // Continue with redirect even if sync fails - session is already established
        // The user can still access the app, but their profile might be incomplete
      }
    } else {
      logger.warn("OAuth user has no email", { userId: user?.id });
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch (error) {
    logger.error("Unexpected error in OAuth callback", {
      error: String((error as Error)?.message || error),
      code,
    });
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("An unexpected error occurred during login. Please try again.")}`,
        url.origin
      )
    );
  }
}
