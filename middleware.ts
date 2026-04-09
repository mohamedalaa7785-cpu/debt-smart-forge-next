import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/* ================= HELPERS ================= */

function createSupabase(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookieValues) => {
          cookieValues.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
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
    pathname.startsWith("/add-client") ||
    pathname.startsWith("/admin")
  );
}

/* ================= MAIN ================= */

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  const supabase = createSupabase(request, response);

  /* 🔥 SECURE USER FETCH */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ================= PUBLIC ================= */
  if (isPublic(pathname)) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  /* ================= NOT AUTH ================= */
  if (!user && isProtected(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  /* ================= ROLE CHECK ================= */
  if (user) {
    /* 🔥 ROOT */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    /* 🔥 ADMIN PROTECTION */
    if (pathname.startsWith("/admin")) {
      // admin check لازم يكون من DB (مش هنا)
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

/* ================= CONFIG ================= */

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
