import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

export async function auditSensitiveAction(userId: string, action: string, details?: Record<string, any>) {
  try {
    await db.insert(auditLogs).values({
      userId,
      action,
      details: details || {},
    });
  } catch (error) {
    console.error("AUDIT ERROR:", error);
  }
}
