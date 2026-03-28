import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/* =========================
   GLOBAL POOL (SAFE FOR SERVERLESS)
========================= */
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

/* =========================
   CREATE POOL (LAZY)
========================= */
function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("❌ DATABASE_URL is missing");
    return null;
  }

  return new Pool({
    connectionString,

    /* 🔥 مهم لـ Supabase */
    ssl: {
      rejectUnauthorized: false,
    },

    max: 5, // serverless friendly
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });
}

/* =========================
   GET POOL
========================= */
const pool =
  global.__dbPool ?? createPool();

if (!pool) {
  throw new Error("Database not initialized");
}

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

/* =========================
   DRIZZLE INSTANCE
========================= */
export const db = drizzle(pool, {
  schema,
});

/* =========================
   HEALTH CHECK (OPTIONAL)
========================= */
export async function checkDb() {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (error) {
    console.error("DB ERROR:", error);
    return false;
  }
}
