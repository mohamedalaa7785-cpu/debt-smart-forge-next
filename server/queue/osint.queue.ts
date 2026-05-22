import { Queue, Worker, type Job } from "bullmq";
import { getRedisClient, hasRedisConfig } from "@/lib/redis";
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

const connection = getRedisClient();

if (connection) {
  connection.on("error", (error: unknown) => {
    logger.warn("REDIS_CONNECTION_ERROR", { error });
  });
}

export const osintQueue = connection
  ? new Queue<OSINTJobPayload>("osint-queue", {
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
    })
  : null;

export async function addOSINTJob(data: OSINTJobPayload) {
  if (!osintQueue) {
    logger.warn("OSINT_QUEUE_DISABLED", {
      reason: hasRedisConfig ? "redis_unavailable" : "missing_redis_url",
    });

    return runOSINT(data);
  }

  const dedupeKey = `${data.clientId || "anon"}:${data.name}:${data.phone || ""}:${data.city || ""}`;

  try {
    return await osintQueue.add("osint-job", data, {
      priority: data.clientId ? 1 : 5,
      jobId: dedupeKey,
    });
  } catch (error) {
    logger.warn("OSINT_QUEUE_ENQUEUE_FAILED", { error });
    return runOSINT(data);
  }
}

export const osintWorker = connection
  ? new Worker<OSINTJobPayload>(
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
    )
  : null;

osintWorker?.on("completed", (job) => {
  logger.info("OSINT_JOB_COMPLETED", {
    jobId: job.id,
  });
});

osintWorker?.on("failed", (job, err) => {
  logger.error("OSINT_JOB_FAILED_FINAL", {
    jobId: job?.id,
    error: err,
  });
});
