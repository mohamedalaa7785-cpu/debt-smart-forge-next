import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/* =========================
   GLOBAL POOL (PREVENT DUPLICATION)
========================= */
declare global {
  // eslint-disable-next-line no-var
  var __dbPool: Pool | undefined;
}

/* =========================
   DATABASE URL
========================= */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ DATABASE_URL is missing");
}

/* =========================
   CREATE POOL
========================= */
const pool =
  global.__dbPool ??
  new Pool({
    connectionString,
    max: 10, // max connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

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
   HELPER (OPTIONAL)
========================= */
export async function getDb() {
  return db;
}
