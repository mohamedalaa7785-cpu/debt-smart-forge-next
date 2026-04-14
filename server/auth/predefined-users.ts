import type { AppRole } from "@/server/lib/role";

export type PredefinedUser = {
  username: string;
  name: string;
  role: AppRole;
  email: string;
};

const PREDEFINED_USERS: PredefinedUser[] = [
  {
    username: "mohamed.alaa",
    name: "Mohamed Alaa",
    role: "hidden_admin",
    email: "mohamed.alaa@local.debtsmart",
  },
  {
    username: "adel",
    name: "Adel",
    role: "admin",
    email: "adel@local.debtsmart",
  },
  {
    username: "loay",
    name: "Loay",
    role: "supervisor",
    email: "loay@local.debtsmart",
  },
  {
    username: "mostafa",
    name: "Mostafa",
    role: "team_leader",
    email: "mostafa@local.debtsmart",
  },
  {
    username: "heba",
    name: "Heba",
    role: "team_leader",
    email: "heba@local.debtsmart",
  },
  {
    username: "noura",
    name: "Noura",
    role: "collector",
    email: "noura@local.debtsmart",
  },
];

const usersByUsername = new Map(PREDEFINED_USERS.map((u) => [u.username, u]));
const usersByEmail = new Map(PREDEFINED_USERS.map((u) => [u.email, u]));

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ".");
}

export function getPredefinedUserByIdentifier(identifier: string): PredefinedUser | null {
  const normalized = normalize(identifier);

  if (normalized.includes("@")) {
    return usersByEmail.get(normalized) || null;
  }

  return usersByUsername.get(normalized) || null;
}

export function listPredefinedUsernames() {
  return PREDEFINED_USERS.map((u) => u.username);
}
