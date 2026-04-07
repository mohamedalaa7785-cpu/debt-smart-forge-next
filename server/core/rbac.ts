import type { NextRequest } from "next/server";

export const ROLES = [
  "admin",
  "supervisor",
  "team_leader",
  "collector",
  "hidden_admin",
] as const;

export type UserRole = (typeof ROLES)[number];
export type Role = UserRole;

type PolicyRule = {
  roles: readonly UserRole[];
  public?: boolean;
};

const ALL_ROLES: readonly UserRole[] = ROLES;
const ADMIN_ROLES: readonly UserRole[] = ["admin", "hidden_admin"] as const;

export const POLICY_MATRIX: Record<string, PolicyRule> = {
  "POST /api/auth/login": { roles: ALL_ROLES, public: true },
  "GET /api/auth/me": { roles: ALL_ROLES },

  "GET /api/clients": { roles: ALL_ROLES },
  "POST /api/clients": { roles: ["admin", "hidden_admin", "supervisor", "team_leader"] },
  "GET /api/client/:id": { roles: ALL_ROLES },

  "GET /api/dashboard": { roles: ALL_ROLES },
  "GET /api/map": { roles: ALL_ROLES },
  "GET /api/search": { roles: ALL_ROLES },
  "GET /api/call-list": { roles: ALL_ROLES },
  "GET /api/call-mode": { roles: ALL_ROLES },
  "GET /api/priority-advanced": { roles: ALL_ROLES },

  "POST /api/actions": { roles: ALL_ROLES },
  "POST /api/osint": { roles: ["admin", "hidden_admin", "supervisor", "team_leader"] },
  "POST /api/upload": { roles: ["admin", "hidden_admin", "supervisor", "team_leader"] },
  "POST /api/whatsapp": { roles: ALL_ROLES },
  "POST /api/settlement": { roles: ALL_ROLES },

  "POST /api/legal": { roles: ["admin", "hidden_admin", "supervisor", "team_leader"] },
  "POST /api/legal#generate_inzar": { roles: ["admin", "hidden_admin", "supervisor"] },
  "POST /api/legal#get_cases": { roles: ["admin", "hidden_admin", "supervisor", "team_leader"] },
  "POST /api/legal#add_case": { roles: ["admin", "hidden_admin", "supervisor"] },
  "POST /api/legal#track_bounced_check": { roles: ["admin", "hidden_admin", "supervisor"] },
};

export function buildPolicyKey(method: string, route: string, action?: string) {
  const base = `${method.toUpperCase()} ${route}`;
  return action ? `${base}#${action}` : base;
}

export function getPolicy(method: string, route: string, action?: string) {
  if (action) {
    const actionPolicy = POLICY_MATRIX[buildPolicyKey(method, route, action)];
    if (actionPolicy) return actionPolicy;
  }
  return POLICY_MATRIX[buildPolicyKey(method, route)] || null;
}

export function isAllowed(role: UserRole, method: string, route: string, action?: string) {
  const policy = getPolicy(method, route, action);
  if (!policy) return false;
  if (ADMIN_ROLES.includes(role)) return true;
  return policy.roles.includes(role);
}

export function getActionFromRequest(req: NextRequest) {
  return req.nextUrl.searchParams.get("action") || undefined;
}
