import { db } from "@/server/db";
import { users, sessions } from "@/server/db/schema";
import { eq } from "drizzle-orm";
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
  return crypto.randomBytes(48).toString("hex");
}

function getExpiryDate() {
  const d = new Date();
  d.setDate(d.getDate() + SESSION_DURATION_DAYS);
  return d;
}

/* =========================
   REGISTER 🔥
========================= */
export async function register(
  email: string,
  password: string,
  role: "admin" | "agent" = "agent"
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    throw new Error("Email already exists");
  }

  const hashed = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email,
      password: hashed,
      role,
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

  if (!user || !user.isActive) {
    throw new Error("Invalid credentials");
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken();

  await db.insert(sessions).values({
    userId: user.id,
    token,
    expiresAt: getExpiryDate(),
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

  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
}

/* =========================
   LOGOUT
========================= */
export async function logout(token: string) {
  try {
    await db.delete(sessions).where(eq(sessions.token, token));
    return true;
  } catch {
    return false;
  }
}

/* =========================
   CLEAN EXPIRED SESSIONS
========================= */
export async function cleanExpiredSessions() {
  try {
    await db.execute(`
      DELETE FROM sessions
      WHERE expires_at < NOW()
    `);
  } catch {}
}
