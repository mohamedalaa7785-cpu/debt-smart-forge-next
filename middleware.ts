// middleware.ts

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.delete(name);
        },
      },
    }
  );

  // 🔥 important: ensures session refresh works
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  /* ----------------------------- PUBLIC ROUTES ----------------------------- */

  const isPublicRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/me") ||
    pathname.startsWith("/api/auth/logout");

  /* ----------------------------- API ROUTES ----------------------------- */

  // ignore all non-auth APIs
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    return response;
  }

  /* ----------------------------- PROTECTED ----------------------------- */

  const isProtectedRoute =
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/add-client");

  /* ----------------------------- NOT AUTH ----------------------------- */

  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* ----------------------------- AUTH USERS ----------------------------- */

  if (session) {
    // root → dashboard
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // block auth pages
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup")
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

/* ----------------------------- CONFIG ----------------------------- */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
