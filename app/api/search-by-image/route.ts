import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { searchSimilarImages } from "@/server/services/image-intelligence.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { SearchByImageBodySchema } from "@/lib/validators/api";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`search-by-image:${user.id}:${ip}`, 20, 60);

      const parsed = SearchByImageBodySchema.safeParse(
        await req.json().catch(() => ({}))
      );

      if (!parsed.success) {
        throw new ValidationError("Invalid search-by-image payload", {
          issues: parsed.error.issues.map((i) => i.message),
        });
      }

      const result = await searchSimilarImages({
        ownerUserId: user.id,
        imageBase64: parsed.data.imageBase64,
        imageUrl: parsed.data.imageUrl,
        limit: parsed.data.limit,
      });

      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}