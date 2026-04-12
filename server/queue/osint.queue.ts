import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { runOSINT } from "@/server/services/osint.service";
import { logger } from "@/server/lib/logger";

/* =========================
   REDIS CONNECTION
========================= */

const connection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

/* =========================
   QUEUE
========================= */

export const osintQueue = new Queue("osint-queue", {
  connection,
  defaultJobOptions: {
    attempts: 3, // retry
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/* =========================
   ADD JOB
========================= */

export async function addOSINTJob(data: {
  clientId?: string;
  name: string;
  phone?: string;
  company?: string;
  city?: string;
  imageUrl?: string;
}) {
  return osintQueue.add("osint-job", data, {
    priority: data.clientId ? 1 : 5, // client jobs أهم
  });
}

/* =========================
   WORKER 🔥
========================= */

export const osintWorker = new Worker(
  "osint-queue",
  async (job: Job) => {
    logger.info("OSINT_JOB_STARTED", { jobId: job.id });

    try {
      const result = await runOSINT(job.data);

      logger.info("OSINT_JOB_SUCCESS", {
        jobId: job.id,
        clientId: job.data.clientId,
      });

      return result;
    } catch (error: any) {
      logger.error("OSINT_JOB_FAILED", {
        jobId: job.id,
        error,
      });

      throw error; // مهم علشان retry
    }
  },
  {
    connection,
    concurrency: 5, // parallel jobs
  }
);

/* =========================
   EVENTS
========================= */

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
