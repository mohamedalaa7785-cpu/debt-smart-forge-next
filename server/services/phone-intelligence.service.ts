import { db } from "@/server/db";
import { clientPhones, clients, osintResults } from "@/server/db/schema";
import { eq, ilike } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

export type PhoneProvider = "official-truecaller" | "rapidapi-truecaller";

export interface PhoneLookupResult {
  phone: string;
  normalized: string;
  name: string | null;
  risk_score: number;
  spam: boolean;
  notes: string;
  source: "internal" | "external" | "mixed";
  provider: PhoneProvider;
  confidenceScore: number;
  tags: string[];
  country: string | null;
  carrier: string | null;
  whatsappAvailable: boolean;
  telegramAvailable: boolean;
  raw?: unknown;
}

function maskSecret(value?: string | null) {
  if (!value) return "missing";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function getProviderConfig() {
  const truecallerKey = process.env.TRUECALLER_API_KEY?.trim();
  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim();
  const truecallerBase = (process.env.TRUECALLER_BASE_URL || process.env.TRUECALLER_API_BASE || "https://api.truecaller.com").trim();

  console.log("[phone-intelligence] env check", {
    TRUECALLER_API_KEY: maskSecret(truecallerKey),
    RAPIDAPI_KEY: maskSecret(rapidApiKey),
    TRUECALLER_BASE_URL: truecallerBase,
  });

  if (truecallerKey) {
    return { provider: "official-truecaller" as const, apiKey: truecallerKey, baseUrl: truecallerBase };
  }
  if (rapidApiKey) {
    return { provider: "rapidapi-truecaller" as const, apiKey: rapidApiKey, baseUrl: "https://truecaller-data2.p.rapidapi.com" };
  }

  throw new Error("No Truecaller provider configured. Set TRUECALLER_API_KEY or RAPIDAPI_KEY.");
}

async function lookupTruecaller(phone: string) {
  const cfg = getProviderConfig();

  if (cfg.provider === "official-truecaller") {
    const url = `${cfg.baseUrl.replace(/\/$/, "")}/v1/search`;
    const payload = { phone };
    console.log("[phone-intelligence] provider selected", { provider: cfg.provider, endpoint: url, payload });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    console.log("[phone-intelligence] provider response", { status: res.status, body: text.slice(0, 2000) });

    if (!res.ok) {
      throw new Error(`Truecaller API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = text ? JSON.parse(text) : {};
    return { provider: cfg.provider, data };
  }

  const url = `${cfg.baseUrl.replace(/\/$/, "")}/search`;
  const payload = { phone };
  console.log("[phone-intelligence] provider selected", { provider: cfg.provider, endpoint: url, payload });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-rapidapi-key": cfg.apiKey,
      "x-rapidapi-host": "truecaller-data2.p.rapidapi.com",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const text = await res.text();
  console.log("[phone-intelligence] provider response", { status: res.status, body: text.slice(0, 2000) });

  if (!res.ok) {
    throw new Error(`RapidAPI Truecaller error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = text ? JSON.parse(text) : {};
  return { provider: cfg.provider, data };
}

function parseProviderResult(phone: string, normalized: string, provider: PhoneProvider, raw: any): Omit<PhoneLookupResult, "source"> {
  const top = raw?.data || raw?.result || raw;
  const name = top?.name || top?.fullName || top?.contactName || null;
  const spamScoreRaw = top?.spamScore ?? top?.spam_score ?? top?.spamLikelihood ?? top?.score;
  const confidenceRaw = top?.confidenceScore ?? top?.confidence_score ?? top?.confidence ?? 0;
  const tags = Array.isArray(top?.tags) ? top.tags : Array.isArray(top?.spamTags) ? top.spamTags : [];

  const riskScore = Math.max(0, Math.min(100, Number(spamScoreRaw ?? 0)));
  const confidenceScore = Math.max(0, Math.min(100, Number(confidenceRaw ?? 0)));
  const parsed = {
    phone,
    normalized,
    name: typeof name === "string" ? name : null,
    risk_score: Number.isFinite(riskScore) ? riskScore : 0,
    spam: riskScore >= 60,
    notes: typeof top?.about === "string" ? top.about : "Truecaller provider response",
    provider,
    confidenceScore: Number.isFinite(confidenceScore) ? confidenceScore : 0,
    tags,
    country: typeof top?.countryCode === "string" ? top.countryCode : null,
    carrier: typeof top?.carrier === "string" ? top.carrier : null,
    whatsappAvailable: Boolean(top?.whatsapp || top?.isWhatsapp),
    telegramAvailable: Boolean(top?.telegram || top?.isTelegram),
    raw,
  };
  console.log("[phone-intelligence] parsing result", {
    provider,
    name: parsed.name,
    risk_score: parsed.risk_score,
    confidenceScore: parsed.confidenceScore,
    tags: parsed.tags,
  });

  return parsed;
}

export async function phoneLookup(phone: string): Promise<PhoneLookupResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 7) {
    throw new Error("Invalid phone format");
  }

  const phonePattern = `%${normalized.slice(-10)}%`;

  const internal = await db
    .select({ clientName: clients.name, osintSummary: osintResults.summary })
    .from(clientPhones)
    .leftJoin(clients, eq(clients.id, clientPhones.clientId))
    .leftJoin(osintResults, eq(osintResults.clientId, clientPhones.clientId))
    .where(ilike(clientPhones.phone, phonePattern))
    .limit(1)
    .then((rows) => rows[0] || null);

  const external = await lookupTruecaller(normalized);
  const parsed = parseProviderResult(phone, normalized, external.provider, external.data);

  return {
    ...parsed,
    source: internal ? "mixed" : "external",
    name: parsed.name || internal?.clientName || null,
  };
}
