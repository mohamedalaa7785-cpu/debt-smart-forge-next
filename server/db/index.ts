import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { getRequiredEnv } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var __dbClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var __dbInstance: PostgresJsDatabase<typeof schema> | undefined;
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

function getSql() {
  if (!globalThis.__dbClient) {
    globalThis.__dbClient = createClient();
  }

  return globalThis.__dbClient;
}

function getDb() {
  if (!globalThis.__dbInstance) {
    globalThis.__dbInstance = drizzle(getSql(), { schema });
  }

  return globalThis.__dbInstance;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = getDb() as any;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export async function checkDb() {
  try {
    await getSql()`SELECT 1`;
    return true;
  } catch (error) {
    console.error("DB ERROR:", error);
    return false;
  }
}
