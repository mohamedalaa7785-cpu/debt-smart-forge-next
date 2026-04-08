import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ---------------- HELPERS ---------------- */

function createSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => request.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) =>
          response.cookies.set({ name, value, ...options }),
        remove: (name: string) => response.cookies.delete(name),
      },
    }
  );
}

function isPublic(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth")
  );
}

function isProtected(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/add-client")
  );
}

function isAdminRoute(pathname: string) {
  return pathname.startsWith("/admin");
}

/* ---------------- MAIN ---------------- */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createSupabase(request, response);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* ---------------- PUBLIC ---------------- */
  if (isPublic(pathname)) {
    if (
      session &&
      (pathname.startsWith("/login") || pathname.startsWith("/signup"))
    ) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  /* ---------------- NOT AUTH ---------------- */
  if (!session && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* ---------------- ROLE SYSTEM ---------------- */
  if (session) {
    const user = session.user;

    // 👑 hidden super user
    const isSuperUser =
      user.email?.toLowerCase().includes("mohamed") ||
      user.user_metadata?.is_super_user;

    const role =
      user.user_metadata?.role || "collector";

    /* -------- SUPER USER (full bypass) -------- */
    if (isSuperUser) {
      return response;
    }

    /* -------- ADMIN ROUTES -------- */
    if (isAdminRoute(pathname)) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    /* -------- ROLE HIERARCHY -------- */
    const roleHierarchy = {
      admin: 4,
      supervisor: 3,
      team_leader: 2,
      collector: 1,
    };

    const userLevel = roleHierarchy[role as keyof typeof roleHierarchy] || 1;

    // مثال: صفحة supervisors
    if (pathname.startsWith("/supervisor") && userLevel < 3) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // مثال: صفحة team leaders
    if (pathname.startsWith("/team") && userLevel < 2) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    /* -------- ROOT REDIRECT -------- */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

/* ---------------- CONFIG ---------------- */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
