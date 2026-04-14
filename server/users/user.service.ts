import { db } from "@/server/db";
import { profiles, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { DbError } from "@/server/core/error.handler";
import { normalizeRole, type AppRole } from "@/server/lib/role";

export async function getUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function getUserByEmail(email: string) {
  return db.query.users.findFirst({ where: eq(users.email, email) });
}

export async function getProfileByUserId(userId: string) {
  return db.query.profiles.findFirst({ where: eq(profiles.userId, userId) });
}

export async function syncAuthUserToPublicUser(payload: {
  id: string;
  email: string;
  name: string | null;
  username?: string | null;
  role: AppRole;
  isSuperUser: boolean;
}) {
  try {
    const normalizedEmail = payload.email.toLowerCase().trim();
    const normalizedRole = normalizeRole(payload.role);
    const username = payload.username?.trim().toLowerCase() || null;

    const [syncedUser] = await db
      .insert(users)
      .values({
        id: payload.id,
        email: normalizedEmail,
        name: payload.name,
        role: normalizedRole,
        isSuperUser: payload.isSuperUser,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: normalizedEmail,
          name: payload.name,
          role: normalizedRole,
          isSuperUser: payload.isSuperUser,
        },
      })
      .returning();

    await db
      .insert(profiles)
      .values({
        userId: payload.id,
        email: normalizedEmail,
        fullName: payload.name,
        username,
        role: normalizedRole,
        isAdmin: normalizedRole === "admin" || normalizedRole === "hidden_admin",
        isHiddenAdmin: normalizedRole === "hidden_admin",
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          email: normalizedEmail,
          fullName: payload.name,
          username,
          role: normalizedRole,
          isAdmin: normalizedRole === "admin" || normalizedRole === "hidden_admin",
          isHiddenAdmin: normalizedRole === "hidden_admin",
          updatedAt: new Date(),
        },
      });

    if (!syncedUser) {
      throw new DbError("Unable to sync user");
    }

    return syncedUser;
  } catch (error) {
    const msg = String((error as Error)?.message || "").toLowerCase();

    if (msg.includes("duplicate key") && (msg.includes("users_email_uidx") || msg.includes("profiles_email_uidx"))) {
      const existing = await db.query.users.findFirst({ where: eq(users.email, payload.email) });

      if (existing && existing.id !== payload.id) {
        throw new DbError("Email already linked to another account");
      }
    }

    if (msg.includes("profiles_username_uidx")) {
      throw new DbError("Username already taken");
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
