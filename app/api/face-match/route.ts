export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { FaceMatchBodySchema } from "@/lib/validators/api";
import { compareFaceSimilarity } from "@/server/services/image-intelligence.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`face-match:${user.id}:${ip}`, 12, 60);

      const parsed = FaceMatchBodySchema.safeParse(
        await req.json().catch(() => ({}))
      );
      if (!parsed.success) {
        throw new ValidationError("Invalid face-match payload", {
          issues: parsed.error.issues.map((i) => i.message),
        });
      }

      const result = await compareFaceSimilarity(
        parsed.data.imageBase64A,
        parsed.data.imageBase64B
      );

      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
