import { NextRequest } from "next/server";
import { rateLimit } from "@/server/core/rate-limit";

const IP_HEADERS = ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"] as const;

export function getClientIp(request: NextRequest): string {
  for (const header of IP_HEADERS) {
    const value = request.headers.get(header);
    if (!value) continue;

    const first = value.split(",")[0]?.trim();
    if (first) return first;
  }

  return "unknown";
}

export function enforceRateLimit(request: NextRequest, namespace: string, limitPerMinute = 20): void {
  const ip = getClientIp(request);
  rateLimit(`${namespace}:${ip}`, limitPerMinute);
}
