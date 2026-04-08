import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createSupabase(request, response);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  /* ---------------- PUBLIC ---------------- */
  if (isPublic(pathname)) {
    if (session && (pathname.startsWith("/login") || pathname.startsWith("/signup"))) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  /* ---------------- PROTECTED ---------------- */
  if (!session && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* ---------------- ROLE CHECK ---------------- */
  if (session) {
    const role = session.user.user_metadata?.role || "collector";

    // admin only pages
    if (isAdminRoute(pathname) && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // redirect root
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
