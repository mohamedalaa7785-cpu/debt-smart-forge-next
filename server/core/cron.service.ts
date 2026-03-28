import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export async function updateBuckets() {
  try {
    await db.execute(sql`
      UPDATE client_loans
      SET bucket = bucket + 1
    `);
  } catch (error) {
    console.error("CRON ERROR:", error);
  }
}
