import { db } from "@/server/db";
import { clientPhones, clients, osintResults } from "@/server/db/schema";
import { eq, like } from "drizzle-orm";
import axios from "axios";

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
  externalSource?: {
    provider: string;
    name?: string;
    confidence?: number;
    raw?: any;
  };
}

async function lookupExternalPhoneProvider(normalized: string) {
  const providerUrl = process.env.TRUECALLER_LOOKUP_URL;
  const providerKey = process.env.TRUECALLER_API_KEY;

  if (!providerUrl || !providerKey) return undefined;

  try {
    const res = await axios.get(providerUrl, {
      params: { phone: normalized },
      headers: { Authorization: `Bearer ${providerKey}` },
      timeout: 8000,
    });

    return {
      provider: "truecaller-compatible",
      name: res.data?.name || undefined,
      confidence: Number(res.data?.confidence || 0),
      raw: res.data || null,
    };
  } catch {
    return undefined;
  }
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export async function trackPhoneNumber(phone: string): Promise<PhoneIntelligenceResult> {
  // 1. Normalize number (remove non-digits, handle country code)
  const normalized = normalizePhone(phone);
  if (normalized.length < 7) {
    return {
      phone,
      normalized,
      whatsappAvailable: false,
      telegramAvailable: false,
      riskFlag: true,
      socialProfiles: [],
      nameDetection: "Invalid phone format",
    };
  }

  const suffix10 = normalized.slice(-10);

  // 2. Search DB for linked client
  const phoneRecord = await db
    .select()
    .from(clientPhones)
    .where(
      like(clientPhones.phone, `%${normalized}%`)
    )
    .limit(1)
    .then((res) => res[0]);

  const fallbackPhoneRecord =
    !phoneRecord && suffix10.length === 10
      ? await db
          .select()
          .from(clientPhones)
          .where(like(clientPhones.phone, `%${suffix10}%`))
          .limit(1)
          .then((res) => res[0])
      : null;

  const selectedPhoneRecord = phoneRecord || fallbackPhoneRecord;

  let linkedClient = undefined;
  if (selectedPhoneRecord?.clientId) {
    const client = await db
      .select()
      .from(clients)
      .where(eq(clients.id, selectedPhoneRecord.clientId))
      .limit(1)
      .then((res) => res[0]);

    if (client) {
      linkedClient = {
        id: client.id,
        name: client.name || "Unknown",
        customerId: client.customerId || "N/A"
      };
    }
  }

  // 3. Search OSINT (Mocked for now, in real app would call SerpAPI/Truecaller API)
  const osintRecord = selectedPhoneRecord?.clientId
    ? await db
        .select()
        .from(osintResults)
        .where(eq(osintResults.clientId, selectedPhoneRecord.clientId))
        .limit(1)
        .then((res) => res[0])
    : null;

  // 4. Return combined intelligence
  const externalSource = await lookupExternalPhoneProvider(normalized);

  return {
    phone,
    normalized,
    linkedClient,
    osint: osintRecord,
    whatsappAvailable: Boolean(externalSource || linkedClient), // more realistic signal
    telegramAvailable: false,
    riskFlag: linkedClient ? false : true, // Flag if not in DB
    socialProfiles: Array.isArray(osintRecord?.social) ? (osintRecord.social as string[]) : [],
    nameDetection: externalSource?.name || linkedClient?.name || "Unknown Caller",
    externalSource,
  };
}
