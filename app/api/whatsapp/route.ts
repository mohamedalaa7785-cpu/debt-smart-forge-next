import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/services/whatsapp.service";
import { APIResponse } from "@/types";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { WhatsAppBodySchema } from "@/lib/validators/api";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const rawBody = await req.json();
      const parsed = WhatsAppBodySchema.safeParse(rawBody);

      if (!parsed.success) {
        throw new ValidationError("Invalid WhatsApp payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const { phone, message, clientId } = parsed.data;

      const client = await getClientById(clientId, user.id, user.role);
      if (!client) {
        throw new ForbiddenError();
      }

      const result = await sendWhatsAppMessage({
        phone,
        message,
        clientId,
        userId: user.id,
      });

      return NextResponse.json({
        success: result.success,
        data: result,
      } as APIResponse<any>);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
