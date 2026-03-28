import { db } from "@/server/db";
import { users, sessions } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* =========================
   CONFIG
========================= */
const SESSION_DURATION_DAYS = 7;

/* =========================
   HELPERS
========================= */
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DURATION_DAYS);
  return d;
}

/* =========================
   REGISTER (ADMIN USE)
========================= */
export async function registerUser(data: {
  email: string;
  password: string;
  role?: "admin" | "agent";
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existing) {
    throw new Error("User already exists");
  }

  const hashed = await bcrypt.hash(data.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      password: hashed,
      role: data.role || "agent",
    })
    .returning();

  return user;
}

/* =========================
   LOGIN 🔐
========================= */
export async function login(email: string, password: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) throw new Error("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) throw new Error("Invalid credentials");

  /* =========================
     DELETE OLD SESSIONS (OPTIONAL)
  ========================= */
  await db.delete(sessions).where(eq(sessions.userId, user.id));

  const token = generateToken();
  const expiresAt = getExpiryDate();

  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  };
}

/* =========================
   GET USER FROM TOKEN
========================= */
export async function getUserFromToken(token: string) {
  if (!token) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
  });

  if (!session) return null;

  /* =========================
     CHECK EXPIRATION
  ========================= */
  if (
    session.expiresAt &&
    new Date(session.expiresAt) < new Date()
  ) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  return user || null;
}

/* =========================
   LOGOUT
========================= */
export async function logout(token: string) {
  if (!token) return false;

  await db.delete(sessions).where(eq(sessions.token, token));

  return true;
}

/* =========================
   CLEAN EXPIRED SESSIONS
   (USE WITH CRON)
========================= */
export async function cleanExpiredSessions() {
  const now = new Date();

  await db
    .delete(sessions)
    .where(
      and(
        sessions.expiresAt,
        // drizzle condition workaround
        // delete where expiresAt < now
      )
    );
}
