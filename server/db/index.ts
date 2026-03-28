import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/* =========================
   GLOBAL CLIENT (SAFE FOR SERVERLESS)
========================= */
declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
}

/* =========================
   CREATE CLIENT (LAZY)
========================= */
function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // In build time, we might not have DATABASE_URL, but we shouldn't throw
    // to allow the build to proceed if it doesn't actually need the DB.
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production");
    }
    return null;
  }

  return postgres(connectionString, {
    ssl: "require",
    max: 1, // serverless friendly
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/* =========================
   GET CLIENT
========================= */
let client: postgres.Sql | null = null;

try {
  client = global.__dbClient ?? createClient();
  
  if (process.env.NODE_ENV !== "production" && client) {
    global.__dbClient = client;
  }
} catch (error) {
  console.error("Failed to initialize database client:", error);
  client = null;
}

/* =========================
   DRIZZLE INSTANCE (WITH FALLBACK)
========================= */
export const db = client ? drizzle(client, { schema }) : ({} as any);

/* =========================
   HEALTH CHECK (OPTIONAL)
========================= */
export async function checkDb() {
  if (!client) return false;
  try {
    await client`SELECT 1`;
    return true;
  } catch (error) {
    console.error("DB ERROR:", error);
    return false;
  }
}
