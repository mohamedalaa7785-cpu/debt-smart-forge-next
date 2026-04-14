import { RateLimitError } from "@/server/core/error.handler";

type CacheEntry = { value: unknown; expiry: number };

const localCache = new Map<string, CacheEntry>();
const localCounters = new Map<string, { count: number; resetAt: number }>();

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return null;
  return { url, token };
}

async function upstashPipeline(commands: Array<Array<string | number>>) {
  const cfg = getUpstashConfig();
  if (!cfg) return null;

  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as Array<{ result?: unknown; error?: string }>;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cfg = getUpstashConfig();

  if (!cfg) {
    const local = localCache.get(key);
    if (!local || local.expiry <= Date.now()) {
      localCache.delete(key);
      return null;
    }
    return local.value as T;
  }

  const result = await upstashPipeline([["GET", key]]);
  const raw = result?.[0]?.result;
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const cfg = getUpstashConfig();
  const payload = JSON.stringify(value);

  if (!cfg) {
    localCache.set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
    return;
  }

  await upstashPipeline([["SETEX", key, ttlSeconds, payload]]);
}

export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const cfg = getUpstashConfig();

  if (!cfg) {
    const now = Date.now();
    const current = localCounters.get(key);
    if (!current || current.resetAt <= now) {
      localCounters.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return;
    }

    current.count += 1;
    if (current.count > limit) {
      throw new RateLimitError();
    }
    return;
  }

  const response = await upstashPipeline([
    ["INCR", key],
    ["TTL", key],
  ]);

  const count = Number(response?.[0]?.result || 0);
  const ttl = Number(response?.[1]?.result || -1);

  if (ttl < 0) {
    await upstashPipeline([["EXPIRE", key, windowSeconds]]);
  }

  if (count > limit) {
    throw new RateLimitError();
  }
}
