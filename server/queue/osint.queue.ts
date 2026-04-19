import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import { runOSINT } from "@/server/services/osint.service";
import { logger } from "@/server/lib/logger";

type OSINTJobPayload = {
  clientId?: string;
  name: string;
  phone?: string;
  company?: string;
  city?: string;
  imageUrl?: string;
};

const REDIS_QUEUE_URL = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
const connection = new IORedis(REDIS_QUEUE_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const osintQueue = new Queue<OSINTJobPayload>("osint-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export async function addOSINTJob(data: OSINTJobPayload) {
  return osintQueue.add("osint-job", data, {
    priority: data.clientId ? 1 : 5,
  });
}

export const osintWorker = new Worker<OSINTJobPayload>(
  "osint-queue",
  async (job: Job<OSINTJobPayload>) => {
    logger.info("OSINT_JOB_STARTED", { jobId: job.id });

    try {
      const result = await runOSINT(job.data);
      logger.info("OSINT_JOB_SUCCESS", {
        jobId: job.id,
        clientId: job.data.clientId,
      });
      return result;
    } catch (error) {
      logger.error("OSINT_JOB_FAILED", {
        jobId: job.id,
        error,
      });

      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

osintWorker.on("completed", (job) => {
  logger.info("OSINT_JOB_COMPLETED", {
    jobId: job.id,
  });
});

osintWorker.on("failed", (job, err) => {
  logger.error("OSINT_JOB_FAILED_FINAL", {
    jobId: job?.id,
    error: err,
  });
});
