import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { uploadImageAndIndex } from "@/server/services/image-intelligence.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`upload-image:${user.id}:${ip}`, 20, 60);

      const body = await req.json().catch(() => ({}));
      const imageBase64 = typeof body?.imageBase64 === "string" ? body.imageBase64 : "";
      const clientId = typeof body?.clientId === "string" ? body.clientId : null;
      const title = typeof body?.title === "string" ? body.title : null;

      if (!imageBase64) {
        throw new ValidationError("imageBase64 is required");
      }

      const data = await uploadImageAndIndex({
        ownerUserId: user.id,
        clientId,
        fileBase64: imageBase64,
        title,
      });

      return NextResponse.json({ success: true, data });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
