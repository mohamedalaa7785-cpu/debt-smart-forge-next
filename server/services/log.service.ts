import { db } from "@/server/db";
import { logs } from "@/server/db/schema";
import { logger } from "@/server/core/logger";

export async function logAction(userId: string, action: string, meta?: Record<string, unknown>) {
  try {
    await db.insert(logs).values({
      userId,
      action,
      meta: meta || {},
    });
  } catch {
    logger.warn("audit_log_insert_failed", { userId, action });
  }
}
