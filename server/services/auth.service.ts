import { db } from "@/server/db";
import { users, sessions } from "@/server/db/schema";
import { eq, sql, lt } from "drizzle-orm";
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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}


/* =========================
   REGISTER 🔥
========================= */
export async function register(
  email: string,
  password: string,
  role: "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin" = "collector"
) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail || password.length < 6) {
    throw new Error("Invalid input");
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, cleanEmail),
  });

  if (existing) {
    throw new Error("Email already exists");
  }

  const hashed = await bcrypt.hash(password, 10);

  const [user] = await db
    .insert(users)
    .values({
      email: cleanEmail,
      password: hashed,
      role,
    })
    .returning();

  return {
    id: user.id,
    email: user.email,
    role: user.role,
  };
}

/* =========================
   LOGIN 🔐
========================= */
export async function login(email: string, password: string) {
  const cleanEmail = normalizeEmail(email);

  const user = await db.query.users.findFirst({
    where: eq(users.email, cleanEmail),
  });

  /* ❌ مهم: متقولش السبب الحقيقي */
  if (!user) {
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
   GET USER FROM TOKEN 🔥🔥🔥
========================= */
export async function getUserFromToken(token: string) {
  try {
    if (!token) return null;

    const session = await db.query.sessions.findFirst({
      where: eq(sessions.token, token),
    });

    if (!session) return null;

    /* =========================
       EXPIRED SESSION
    ========================= */
    if (
      session.expiresAt &&
      new Date(session.expiresAt) < new Date()
    ) {
      // 🔥 تنظيف تلقائي
      await db
        .delete(sessions)
        .where(eq(sessions.token, token));

      return null;
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.userId),
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    console.error("getUserFromToken error:", error);
    return null;
  }
}

/* =========================
   LOGOUT 🔥
========================= */
export async function logout(token: string) {
  try {
    if (!token) return false;

    await db
      .delete(sessions)
      .where(eq(sessions.token, token));

    return true;
  } catch (error) {
    console.error("logout error:", error);
    return false;
  }
}

/* =========================
   LOGOUT ALL DEVICES 🔥🔥🔥
========================= */
export async function logoutAll(userId: string) {
  try {
    await db
      .delete(sessions)
      .where(eq(sessions.userId, userId));

    return true;
  } catch (error) {
    console.error("logoutAll error:", error);
    return false;
  }
}

/* =========================
   CLEAN EXPIRED SESSIONS
========================= */
export async function cleanExpiredSessions() {
  try {
    await db
      .delete(sessions)
      .where(lt(sessions.expiresAt, sql`NOW()`));
  } catch (error) {
    console.error("clean sessions error:", error);
  }
}
