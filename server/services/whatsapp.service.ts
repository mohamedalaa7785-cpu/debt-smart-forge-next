import { db } from "@/server/db";
import { clientActions } from "@/server/db/schema";

export interface WhatsAppMessage {
  phone: string;
  message: string;
  clientId: string;
  userId: string;
}

export async function sendWhatsAppMessage(data: WhatsAppMessage) {
  try {
    // 1. Normalize phone
    const normalized = data.phone.replace(/\D/g, "");
    
    // 2. Generate WhatsApp Link
    const link = `https://wa.me/${normalized}?text=${encodeURIComponent(data.message)}`;
    
    // 3. Log Action in DB
    await db.insert(clientActions).values({
      clientId: data.clientId,
      userId: data.userId,
      actionType: "WHATSAPP",
      note: `Sent WhatsApp message: ${data.message.substring(0, 50)}...`
    });

    return {
      success: true,
      link
    };
  } catch (error) {
    console.error("sendWhatsAppMessage error:", error);
    return {
      success: false,
      error: "Failed to generate WhatsApp link"
    };
  }
}
