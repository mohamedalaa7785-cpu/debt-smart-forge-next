import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/services/whatsapp.service";
import { APIResponse } from "@/types";
import { requireUser } from "@/server/lib/auth";
import { canAccessClient, getClientById } from "@/server/services/client.service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { phone, message, clientId } = body;

    if (!phone || !message || !clientId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const client = await getClientById(clientId);
    if (!client || !canAccessClient(client, user.id, user.role)) {
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
    console.error("POST /api/whatsapp error:", error);
    const status = error?.message === "Unauthorized" || error?.message === "Invalid session" ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send WhatsApp message" },
      { status }
    );
  }
}
