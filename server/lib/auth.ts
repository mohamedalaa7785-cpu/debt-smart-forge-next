import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/server/services/auth.service";
import { getPolicy, isAllowed, type UserRole } from "@/server/core/rbac";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

type GuardPolicy = {
  method: string;
  route: string;
  action?: string;
};

function fail(error: string, status = 401) {
  return NextResponse.json({ success: false, error }, { status });
}

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const clean = authHeader.trim();
  if (clean.toLowerCase().startsWith("bearer ")) {
    return clean.slice(7).trim();
  }
  return clean;
}

export async function requireUser(req: NextRequest): Promise<AuthUser> {
  const token = extractToken(req);
  if (!token) throw new Error("Unauthorized");

  const user = await getUserFromToken(token);
  if (!user) throw new Error("Invalid session");

  return user as AuthUser;
}

export function requireRole(user: AuthUser, roles: UserRole[]) {
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
}

export async function withApiGuard(
  req: NextRequest,
  policy: GuardPolicy,
  handler: (user: AuthUser | null) => Promise<NextResponse>
) {
  try {
    const matchedPolicy = getPolicy(policy.method, policy.route, policy.action);
    if (!matchedPolicy) {
      return fail(`Policy is not defined for ${policy.method} ${policy.route}`, 500);
    }

    if (matchedPolicy.public) {
      return await handler(null);
    }

    const user = await requireUser(req);

    if (!isAllowed(user.role, policy.method, policy.route, policy.action)) {
      return fail("Forbidden", 403);
    }

    return await handler(user);
  } catch (error: any) {
    const message = error?.message || "Unauthorized";
    const status = message === "Forbidden" ? 403 : 401;
    return fail(message, status);
  }
}
