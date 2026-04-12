export type AppRole = "admin" | "supervisor" | "team_leader" | "collector";

export function resolveRoleByEmail(email: string): AppRole {
  const normalized = email.toLowerCase();

  if (normalized.includes("adel")) return "admin";
  if (normalized.includes("loai")) return "supervisor";
  if (normalized.includes("mostafa") || normalized.includes("heba")) {
    return "team_leader";
  }

  return "collector";
}

export function isSuperUserEmail(email: string): boolean {
  return email.toLowerCase().includes("mohamed");
}
