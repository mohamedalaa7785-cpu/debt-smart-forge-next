import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export async function ensureUsersTableColumns() {
  await db.execute(sql`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'collector',
    ADD COLUMN IF NOT EXISTS is_super_user boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
  `);
}

export function isMissingUsersColumnError(error: unknown) {
  const message = String((error as any)?.message || "").toLowerCase();
  return (
    message.includes("column") &&
    message.includes("users") &&
    message.includes("does not exist")
  );
}
