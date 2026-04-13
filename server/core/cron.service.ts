import { db } from "@/server/db";
import { sql } from "drizzle-orm";

export async function updateBuckets() {
  try {
    await db.execute(sql`
      UPDATE client_loans
      SET
        bucket = COALESCE(bucket, 0) + 1,
        overdue = COALESCE(emi, 0) * (COALESCE(bucket, 0) + 1),
        amount_due = COALESCE(emi, 0) * (COALESCE(bucket, 0) + 1)
      WHERE cycle IS NOT NULL
        AND cycle BETWEEN 1 AND 31
        AND cycle = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'UTC'))
    `);
  } catch (error) {
    console.error("CRON ERROR:", error);
  }
}
