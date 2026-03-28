import { db } from "@/server/db";

export async function updateBuckets() {
  try {
    await db.execute(`
      UPDATE client_loans
      SET bucket = bucket + 1
    `);
  } catch (error) {
    console.error("CRON ERROR:", error);
  }
}
