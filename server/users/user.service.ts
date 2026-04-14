import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { DbError } from "@/server/core/error.handler";

export async function getUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email) });
}

export async function syncAuthUserToPublicUser(payload: {
  id: string;
  email: string;
  name: string | null;
  role: "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin";
  isSuperUser: boolean;
}) {
  try {
    const [synced] = await db
      .insert(users)
      .values({
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        isSuperUser: payload.isSuperUser,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: payload.email,
          name: payload.name,
          role: payload.role,
          isSuperUser: payload.isSuperUser,
        },
      })
      .returning();

    if (!synced) {
      throw new DbError("Unable to sync user");
    }

    return synced;
  } catch (error) {
    const msg = String((error as Error)?.message || "").toLowerCase();

    if (msg.includes("duplicate key") && msg.includes("users_email_uidx")) {
      const existing = await db.query.users.findFirst({ where: eq(users.email, payload.email) });

      if (existing && existing.id !== payload.id) {
        throw new DbError("Email already linked to another account");
      }
    }

    throw error;
  }
}

export async function assertOwnershipOrPrivileged(params: {
  ownerId: string | null | undefined;
  userId: string;
  privileged: boolean;
}) {
  if (params.privileged) return true;
  return Boolean(params.ownerId && params.ownerId === params.userId);
}
