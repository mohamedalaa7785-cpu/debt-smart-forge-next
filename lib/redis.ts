import Redis from "ioredis";
import { logger } from "@/server/lib/logger";

const redisUrl = process.env.REDIS_URL?.trim();
export const hasRedisConfig = Boolean(redisUrl);

let redisClient: Redis | null = null;

function buildRedisOptions() {
  return {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: redisUrl?.startsWith("rediss://") ? {} : undefined,
    retryStrategy: (times: number) => Math.min(times * 200, 5000),
    reconnectOnError: () => true,
  };
}

export function createRedisConnection(): Redis {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  const client = new Redis(redisUrl, buildRedisOptions());

  client.on("error", (error) => {
    logger.error("REDIS_ERROR", { error: error.message });
  });

  client.on("reconnecting", (delay) => {
    logger.warn("REDIS_RECONNECTING", { delay });
  });

  client.on("ready", () => {
    logger.info("REDIS_READY");
  });

  return client;
}

export async function getRedisClient(): Promise<Redis | null> {
  if (!hasRedisConfig) return null;

  if (!redisClient) {
    redisClient = createRedisConnection();
  }

  const client = redisClient as any;
  if (client.status === "wait") {
    await client.connect();
  }

  return redisClient;
}
