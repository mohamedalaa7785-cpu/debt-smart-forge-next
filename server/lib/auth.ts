import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   TYPES 🔥
========================= */
export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin";
  name?: string | null;
}

/* =========================
   HELPERS
========================= */
function fail(error: string, status = 401) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/* =========================
   REQUIRE USER 🔐 (SUPABASE SSR)
========================= */
export async function requireUser(
  req: NextRequest
): Promise<AuthUser> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    console.warn("⚠️ Unauthorized access attempt");
    throw new Error("Unauthorized");
  }

  // Get user details from our public.users table (synced via trigger)
  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser) {
    console.warn(`⚠️ User ${user.id} not found in public.users table`);
    throw new Error("User record not found");
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role as any,
    name: dbUser.name,
  };
}

/* =========================
   REQUIRE ROLE 🧠
========================= */
export function requireRole(
  user: AuthUser,
  roles: AuthUser["role"][]
) {
  if (user.role === "hidden_admin") return; // hidden_admin bypasses all
  
  if (!roles.includes(user.role)) {
    console.warn(
      `⚠️ Forbidden access by user ${user.id} role=${user.role}`
    );
    throw new Error("Forbidden");
  }
}

/* =========================
   WITH AUTH WRAPPER 🔥🔥🔥
========================= */
export async function withAuth(
  req: NextRequest,
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  try {
    const user = await requireUser(req);
    return await handler(user);
  } catch (error: any) {
    return fail(error?.message || "Unauthorized", 401);
  }
}

/* =========================
   WITH ROLE WRAPPER 🔥
========================= */
export async function withRole(
  req: NextRequest,
  roles: AuthUser["role"][],
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  try {
    const user = await requireUser(req);
    requireRole(user, roles);
    return await handler(user);
  } catch (error: any) {
    return fail(error?.message || "Forbidden", 403);
  }
}
