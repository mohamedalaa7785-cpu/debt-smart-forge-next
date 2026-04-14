import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";
import { normalizeRole } from "@/server/lib/role";

type UserRoleRow = {
  role: string | null;
  is_hidden_admin: boolean | null;
};

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
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth/callback")
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

async function getDbRole(
  supabase: ReturnType<typeof createSupabase>,
  userId: string
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role,is_hidden_admin")
    .eq("id", userId) // ✅ FIX IMPORTANT
    .maybeSingle<UserRoleRow>();

  if (error) {
    console.error("Role fetch error:", error);
    return { role: "user", isSuperUser: false };
  }

  return {
    role: normalizeRole(data?.role),
    isSuperUser: Boolean(data?.is_hidden_admin),
  };
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (!hasSupabaseEnv()) return response;

  const supabase = createSupabase(request, response);

  // ✅ FIX: use session instead of getUser
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  // ========================
  // Public routes
  // ========================
  if (isPublic(pathname)) {
    if (user && (pathname === "/login" || pathname === "/signup")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  // ========================
  // Protected routes
  // ========================
  if (!user && isProtected(pathname)) {
    if (pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // ========================
  // Root redirect
  // ========================
  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // ========================
  // Admin protection
  // ========================
  if (
    user &&
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/dashboard/admin"))
  ) {
    const roleState = await getDbRole(supabase, user.id);

    const isAdminLike =
      roleState?.isSuperUser ||
      roleState?.role === "admin" ||
      roleState?.role === "hidden_admin";

    if (!isAdminLike) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
