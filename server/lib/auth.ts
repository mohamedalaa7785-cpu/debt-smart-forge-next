import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/server/services/auth.service";

/* =========================
   TYPES 🔥
========================= */
export interface AuthUser {
  id: string;
  email: string;
  role: "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin";
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
   EXTRACT TOKEN 🔥 (SAFE)
========================= */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return null;

  const clean = authHeader.trim();

  if (clean.toLowerCase().startsWith("bearer ")) {
    return clean.slice(7).trim();
  }

  return clean;
}

/* =========================
   REQUIRE USER 🔐 (SAFE)
========================= */
export async function requireUser(
  req: NextRequest
): Promise<AuthUser> {
  const token = extractToken(req);

  if (!token) {
    console.warn("⚠️ Missing token");
    throw new Error("Unauthorized");
  }

  const user = await getUserFromToken(token);

  if (!user) {
    console.warn("⚠️ Invalid session");
    throw new Error("Invalid session");
  }

  return user as AuthUser;
}

/* =========================
   REQUIRE ROLE 🧠
========================= */
export function requireRole(
  user: AuthUser,
  roles: AuthUser["role"][]
) {
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
