import { Queue } from "bullmq";
import { getRedisClient, hasRedisConfig } from "@/lib/redis";
import { logger } from "@/server/lib/logger";

export const OSINT_QUEUE_NAME = "osint-search";

export type OsintJobType = "osint" | "social-search" | "phone-intelligence" | "ai-analysis";

export type OsintJobPayload = {
  type: OsintJobType;
  clientId: string;
  name?: string;
  phone?: string;
  company?: string;
  city?: string;
  imageUrl?: string;
};

let queueInstance: Queue<OsintJobPayload> | null = null;

export async function getOsintQueue() {
  if (!hasRedisConfig) return null;
  if (queueInstance) return queueInstance;

  const connection = await getRedisClient();
  if (!connection) return null;

  queueInstance = new Queue<OsintJobPayload>(OSINT_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 4,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  });

  return queueInstance;
}

export async function enqueueOsintJob(payload: OsintJobPayload) {
  const queue = await getOsintQueue();
  if (!queue) {
    logger.warn("OSINT_QUEUE_UNAVAILABLE", { reason: "missing_or_unreachable_redis" });
    return null;
  }

  return queue.add(payload.type, payload, {
    jobId: `${payload.type}:${payload.clientId}:${payload.phone || payload.name || Date.now()}`,
  });
}


export async function addOSINTJob(data: Omit<OsintJobPayload, "type">) {
  return enqueueOsintJob({ type: "osint", ...data });
}
