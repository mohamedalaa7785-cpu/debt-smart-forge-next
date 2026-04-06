import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/services/whatsapp.service";
import { APIResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, message, clientId, userId } = body;

    if (!phone || !message || !clientId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage({
      phone,
      message,
      clientId,
      userId: userId || "unknown"
    });

    return NextResponse.json({
      success: result.success,
      data: result
    } as APIResponse<any>);
  } catch (error) {
    console.error("POST /api/whatsapp error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send WhatsApp message" },
      { status: 500 }
    );
  }
}
