import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { searchSimilarImages } from "@/server/services/image-intelligence.service";
import { handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`search-by-image:${user.id}:${ip}`, 20, 60);

      const body = await req.json().catch(() => ({}));
      const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : undefined;
      const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : undefined;
      const limit = Number(body?.limit || 5);

      const result = await searchSimilarImages({
        ownerUserId: user.id,
        imageBase64,
        imageUrl,
        limit,
      });

      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
