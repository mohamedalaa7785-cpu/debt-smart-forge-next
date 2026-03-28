import { NextRequest } from "next/server";
import { getUserFromToken } from "@/server/services/auth.service";

/* =========================
   EXTRACT TOKEN
========================= */
function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.replace("Bearer ", "");
  }

  return authHeader;
}

/* =========================
   REQUIRE USER 🔐
========================= */
export async function requireUser(req: NextRequest) {
  const token = extractToken(req);

  if (!token) {
    throw new Error("Unauthorized");
  }

  const user = await getUserFromToken(token);

  if (!user) {
    throw new Error("Invalid session");
  }

  return user;
}

/* =========================
   REQUIRE ROLE 🧠
========================= */
export function requireRole(
  user: any,
  roles: ("admin" | "agent")[]
) {
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

/* =========================
   SAFE WRAPPER (PRODUCTION)
========================= */
export async function withAuth(
  req: NextRequest,
  handler: (user: any) => Promise<any>
) {
  try {
    const user = await requireUser(req);
    return await handler(user);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unauthorized",
      status: 401,
    };
  }
}
