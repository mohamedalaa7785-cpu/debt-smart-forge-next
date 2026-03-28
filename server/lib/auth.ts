import { NextRequest } from "next/server";
import { getUserFromToken } from "@/server/services/auth.service";

/* =========================
   CUSTOM ERROR
========================= */
export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/* =========================
   EXTRACT TOKEN
========================= */
function extractToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization");

  if (!header) return null;

  // Support: Bearer TOKEN
  if (header.startsWith("Bearer ")) {
    return header.replace("Bearer ", "").trim();
  }

  // fallback: raw token
  return header;
}

/* =========================
   REQUIRE USER 🔐
========================= */
export async function requireUser(req: NextRequest) {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AuthError("Unauthorized: Missing token", 401);
    }

    const user = await getUserFromToken(token);

    if (!user) {
      throw new AuthError("Unauthorized: Invalid session", 401);
    }

    return user;
  } catch (error: any) {
    if (error instanceof AuthError) throw error;

    throw new AuthError("Authentication failed", 401);
  }
}

/* =========================
   REQUIRE ROLE 🔐
========================= */
export function requireRole(
  user: any,
  role: "admin" | "agent"
) {
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }

  // admin يقدر يعمل كل حاجة
  if (user.role === "admin") return;

  if (user.role !== role) {
    throw new AuthError("Forbidden: Insufficient permissions", 403);
  }
}

/* =========================
   OPTIONAL USER
   (لو عايز endpoint مفتوح)
========================= */
export async function optionalUser(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) return null;

    return await getUserFromToken(token);
  } catch {
    return null;
  }
}

/* =========================
   SAFE WRAPPER 🔥
   يمنع crash في APIs
========================= */
export async function withAuth(
  req: NextRequest,
  handler: (user: any) => Promise<Response>
) {
  try {
    const user = await requireUser(req);

    return await handler(user);
  } catch (error: any) {
    const status = error.status || 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal error",
      }),
      {
        status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
      }
