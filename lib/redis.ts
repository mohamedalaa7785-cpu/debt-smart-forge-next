import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL?.trim();

export const hasRedisConfig = Boolean(redisUrl);

let redisClient: Redis | null = null;

export function createRedisConnection(): Redis {
  if (!redisUrl) {
    throw new Error("REDIS_URL is not configured");
  }

  return new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

export function getRedisClient(): Redis | null {
  if (!hasRedisConfig) {
    return null;
  }

  if (!redisClient) {
    redisClient = createRedisConnection();
  }

  return redisClient;
}
