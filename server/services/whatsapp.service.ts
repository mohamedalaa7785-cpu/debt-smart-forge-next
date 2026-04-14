import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";
import { buildWhatsAppUrl } from "@/server/core/whatsapp.service";
import { normalizePhone } from "@/lib/utils";

export interface WhatsAppMessage {
  phone: string;
  message: string;
  clientId: string;
  userId: string;
}

export async function sendWhatsAppMessage(data: WhatsAppMessage) {
  try {
    if (!data.phone || !data.message || !data.clientId || !data.userId) {
      return { success: false, error: "Missing required parameters" };
    }

    const normalized = normalizePhone(data.phone);
    if (!normalized) {
      return { success: false, error: "Invalid phone number" };
    }

    const link = buildWhatsAppUrl(normalized, data.message);

    await db.insert(clientActions).values({
      clientId: data.clientId,
      userId: data.userId,
      actionType: "WHATSAPP",
      note: `Sent WhatsApp message (${data.message.substring(0, 120)})`,
    });

    return { success: true, link };
  } catch {
    return { success: false, error: "Failed to generate WhatsApp link" };
  }
}
