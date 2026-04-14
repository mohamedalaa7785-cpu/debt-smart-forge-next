export const APP_ROLES = [
  "hidden_admin",
  "admin",
  "supervisor",
  "team_leader",
  "collector",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_SET = new Set<string>(APP_ROLES);

export function isAppRole(role: unknown): role is AppRole {
  return typeof role === "string" && ROLE_SET.has(role);
}

export function normalizeRole(role: unknown): AppRole {
  if (isAppRole(role)) return role;
  return "collector";
}

export function canManageUsers(role: AppRole): boolean {
  return role === "hidden_admin";
}

export function canAssignClients(role: AppRole): boolean {
  return role === "admin" || role === "hidden_admin";
}

export function canDeleteClients(role: AppRole): boolean {
  return role === "admin" || role === "hidden_admin";
}

export function resolveRoleByEmail(_email?: string): AppRole {
  return "collector";
}

export function isSuperUserEmail(email: string): boolean {
  const allowlist = (process.env.HIDDEN_ADMIN_EMAILS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase());
}
