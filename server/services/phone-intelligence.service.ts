import { db } from "@/server/db";
import { clientPhones, clients, osintResults } from "@/server/db/schema";
import { eq, like } from "drizzle-orm";

export interface PhoneIntelligenceResult {
  phone: string;
  normalized: string;
  linkedClient?: {
    id: string;
    name: string;
    customerId: string;
  };
  osint?: any;
  whatsappAvailable: boolean;
  telegramAvailable: boolean;
  riskFlag: boolean;
  socialProfiles: string[];
  nameDetection?: string;
}

export async function trackPhoneNumber(phone: string): Promise<PhoneIntelligenceResult> {
  // 1. Normalize number (remove non-digits, handle country code)
  const normalized = phone.replace(/\D/g, "");
  
  // 2. Search DB for linked client
  const phoneRecord = await db.select().from(clientPhones).where(like(clientPhones.phone, `%${normalized}%`)).limit(1).then(res => res[0]);
  
  let linkedClient = undefined;
  if (phoneRecord?.clientId) {
    const client = await db.select().from(clients).where(eq(clients.id, phoneRecord.clientId)).limit(1).then(res => res[0]);
    if (client) {
      linkedClient = {
        id: client.id,
        name: client.name || "Unknown",
        customerId: client.customerId || "N/A"
      };
    }
  }

  // 3. Search OSINT (Mocked for now, in real app would call SerpAPI/Truecaller API)
  const osintRecord = phoneRecord?.clientId
    ? await db.select().from(osintResults).where(eq(osintResults.clientId, phoneRecord.clientId)).limit(1).then(res => res[0])
    : null;

  // 4. Return combined intelligence
  return {
    phone,
    normalized,
    linkedClient,
    osint: osintRecord,
    whatsappAvailable: true, // Assume true for now
    telegramAvailable: false,
    riskFlag: linkedClient ? false : true, // Flag if not in DB
    socialProfiles: osintRecord?.social ? Object.keys(osintRecord.social as object) : [],
    nameDetection: linkedClient?.name || "Unknown Caller"
  };
}
