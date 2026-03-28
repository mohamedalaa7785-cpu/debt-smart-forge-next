import { db } from "@/server/db";
import { logs } from "@/server/db/schema";

/* =========================
   LOG ACTION
========================= */
export async function logAction(
  userId: string,
  action: string,
  meta?: any
) {
  try {
    await db.insert(logs).values({
      userId,
      action,
      meta: meta || {},
    });
  } catch (error) {
    console.error("LOG ERROR:", error);
  }
}
