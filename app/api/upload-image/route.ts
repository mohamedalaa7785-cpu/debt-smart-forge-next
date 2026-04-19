import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { uploadImageAndIndex } from "@/server/services/image-intelligence.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { UploadImageBodySchema } from "@/lib/validators/api";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`upload-image:${user.id}:${ip}`, 20, 60);

      const parsed = UploadImageBodySchema.safeParse(await req.json().catch(() => ({})));
      if (!parsed.success) {
        throw new ValidationError("Invalid upload-image payload", {
          issues: parsed.error.issues.map((i) => i.message),
        });
      }

      const data = await uploadImageAndIndex({
        ownerUserId: user.id,
        clientId: parsed.data.clientId ?? null,
        fileBase64: parsed.data.imageBase64,
        title: parsed.data.title ?? null,
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
