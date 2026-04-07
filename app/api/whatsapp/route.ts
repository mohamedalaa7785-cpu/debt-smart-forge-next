import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppMessage } from "@/server/services/whatsapp.service";
import { APIResponse } from "@/types";
import { withApiGuard } from "@/server/lib/auth";
import { auditSensitiveAction } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  return withApiGuard(req, { method: "POST", route: "/api/whatsapp" }, async (user) => {
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
      const body = await req.json();
      const { phone, message, clientId } = body;

      if (!phone || !message || !clientId) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
      }

      const result = await sendWhatsAppMessage({ phone, message, clientId, userId: user.id });
      await auditSensitiveAction(user.id, "CLIENT_WHATSAPP", { clientId, phone });

      return NextResponse.json({ success: result.success, data: result } as APIResponse<any>);
    } catch (error) {
      console.error("POST /api/whatsapp error:", error);
      return NextResponse.json({ success: false, error: "Failed to send WhatsApp message" }, { status: 500 });
    }
  });
}
