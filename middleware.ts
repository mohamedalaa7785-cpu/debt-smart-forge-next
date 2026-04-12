import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";

function createSupabase(request: NextRequest, response: NextResponse) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookieValues) => {
        cookieValues.forEach(({ name, value, options }) => {
          response.cookies.set({ name, value, ...options });
        });
      },
    },
  });
}

function isPublic(pathname: string) {
  return pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/api/auth");
}

function isProtected(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/add-client") ||
    pathname.startsWith("/admin")
  );
}

function isAdminLike(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> }) {
  const role = String(user.app_metadata?.role || user.user_metadata?.role || "").toLowerCase();
  const superUser = Boolean(user.app_metadata?.is_super_user || user.user_metadata?.is_super_user);

  return superUser || role === "admin" || role === "hidden_admin";
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (!hasSupabaseEnv()) return response;

  const supabase = createSupabase(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isPublic(pathname)) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (user && pathname.startsWith("/admin") && !isAdminLike(user)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
