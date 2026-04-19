import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit, cacheGet, cacheSet } from "@/server/core/distributed-cache";
import { phoneLookup } from "@/server/services/phone-intelligence.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`phone-lookup:${user.id}:${ip}`, 25, 60);

      const phone = req.nextUrl.searchParams.get("phone")?.trim() || "";
      if (!phone) throw new ValidationError("phone query parameter is required");

      const cacheKey = `phone-lookup:${user.id}:${phone}`;
      const cached = await cacheGet<Awaited<ReturnType<typeof phoneLookup>>>(cacheKey);
      if (cached) {
        return NextResponse.json({ success: true, cached: true, data: cached });
      }

      const data = await phoneLookup(phone);
      await cacheSet(cacheKey, data, 300);

      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
