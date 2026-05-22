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
  logger.info("OSINT_QUEUE_REDIS_STATUS", { hasRedisConfig });
  if (!hasRedisConfig) return null;
  if (queueInstance) return queueInstance;

  const connection = await getRedisClient();
  if (!connection) {
    logger.warn("OSINT_QUEUE_REDIS_CONNECTION_FAILED");
    return null;
  }
  logger.info("OSINT_QUEUE_REDIS_CONNECTED");

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

  const job = await queue.add(payload.type, payload, {
    jobId: `${payload.type}:${payload.clientId}:${payload.phone || payload.name || Date.now()}`,
  });
  logger.info("OSINT_QUEUE_JOB_ADDED", { type: payload.type, clientId: payload.clientId, jobId: job.id });
  return job;
}


export async function addOSINTJob(data: Omit<OsintJobPayload, "type">) {
  return enqueueOsintJob({ type: "osint", ...data });
}
