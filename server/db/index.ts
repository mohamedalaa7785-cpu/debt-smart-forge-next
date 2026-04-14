import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getRequiredEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
}

function createClient() {
  const connectionString = getRequiredEnv("DATABASE_URL");

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  return postgres(connectionString, {
    ssl: isLocal ? undefined : "require",
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

const sql = globalThis.__dbClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__dbClient = sql;
}

export const db = drizzle(sql, { schema });

export async function checkDb() {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("DB ERROR:", error);
    return false;
  }
}
