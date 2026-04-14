import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/services/whatsapp.service";
import { APIResponse } from "@/types";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { WhatsAppBodySchema } from "@/lib/validators/api";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const rawBody = await req.json();
    const parsed = WhatsAppBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid WhatsApp payload" }, { status: 400 });
    }

    const { phone, message, clientId } = parsed.data;

    const client = await getClientById(clientId, user.id, user.role);
    if (!client) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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
  } catch (error: any) {
    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send WhatsApp message" },
      { status }
    );
  }
}
