import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";
import { normalizeRole } from "@/server/lib/role";

type UserRoleRow = {
  role: string | null;
  is_super_user: boolean | null;
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
  return pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/api/auth");
}

function isProtected(pathname: string) {
  return pathname === "/" || pathname.startsWith("/dashboard") || pathname.startsWith("/client") || pathname.startsWith("/add-client") || pathname.startsWith("/admin");
}

async function getDbRole(supabase: ReturnType<typeof createSupabase>, userId: string) {
  const { data } = await supabase
    .from("users")
    .select("role,is_super_user")
    .eq("id", userId)
    .maybeSingle<UserRoleRow>();

  return {
    role: normalizeRole(data?.role),
    isSuperUser: Boolean(data?.is_super_user),
  };
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

  if (user && pathname.startsWith("/admin")) {
    const roleState = await getDbRole(supabase, user.id);
    const isAdminLike = roleState.isSuperUser || roleState.role === "admin" || roleState.role === "hidden_admin";

    if (!isAdminLike) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
