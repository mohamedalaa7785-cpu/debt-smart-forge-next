import OpenAI from "openai";
import { db } from "@/server/db";
import { clientPhones, clients, osintResults } from "@/server/db/schema";
import { eq, ilike, sql } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

export interface PhoneLookupResult {
  phone: string;
  normalized: string;
  name: string | null;
  risk_score: number;
  spam: boolean;
  notes: string;
  source: "internal" | "external" | "mixed";
}

let openaiClient: OpenAI | null = null;
function getOpenAI() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) return null;
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function lookupSerpApi(phone: string) {
  const key = process.env.SERPAPI_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", `\"${phone}\" spam caller name`);
  url.searchParams.set("api_key", key);

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();

    const organic = Array.isArray(data?.organic_results) ? data.organic_results.slice(0, 5) : [];
    const snippets = organic
      .map((r: any) => `${r?.title || ""}. ${r?.snippet || ""}`.trim())
      .filter(Boolean)
      .join("\n");

    return {
      snippets,
      raw: organic,
    };
  } catch {
    return null;
  }
}

async function analyzePhone(params: {
  phone: string;
  internalName?: string | null;
  hasInternalRecord: boolean;
  externalSnippets?: string;
  osintSummary?: string | null;
}) {
  const fallbackRisk = params.hasInternalRecord ? 30 : 70;
  const fallbackSpam = !params.hasInternalRecord;

  const openai = getOpenAI();
  if (!openai) {
    return {
      name: params.internalName || null,
      risk_score: fallbackRisk,
      spam: fallbackSpam,
      notes: params.hasInternalRecord ? "Found in internal records" : "No internal record",
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Analyze a phone profile. Return strict JSON keys: name,risk_score,spam,notes. risk_score must be 0..100. notes max 160 chars.",
        },
        {
          role: "user",
          content: JSON.stringify(params),
        },
      ],
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      name: typeof parsed?.name === "string" ? parsed.name : params.internalName || null,
      risk_score: Math.max(0, Math.min(100, Number(parsed?.risk_score ?? fallbackRisk))),
      spam: Boolean(parsed?.spam),
      notes: typeof parsed?.notes === "string" ? parsed.notes.slice(0, 160) : "AI-assisted phone risk analysis",
    };
  } catch {
    return {
      name: params.internalName || null,
      risk_score: fallbackRisk,
      spam: fallbackSpam,
      notes: "Fallback risk analysis used",
    };
  }
}

export async function phoneLookup(phone: string): Promise<PhoneLookupResult> {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 7) {
    return {
      phone,
      normalized,
      name: null,
      risk_score: 95,
      spam: true,
      notes: "Invalid phone format",
      source: "external",
    };
  }

  const phonePattern = `%${normalized.slice(-10)}%`;

  const internal = await db
    .select({
      clientId: clientPhones.clientId,
      clientName: clients.name,
      osintSummary: osintResults.summary,
    })
    .from(clientPhones)
    .leftJoin(clients, eq(clients.id, clientPhones.clientId))
    .leftJoin(osintResults, eq(osintResults.clientId, clientPhones.clientId))
    .where(ilike(clientPhones.phone, phonePattern))
    .limit(1)
    .then((rows) => rows[0] || null);

  const external = await lookupSerpApi(normalized);

  const analyzed = await analyzePhone({
    phone: normalized,
    internalName: internal?.clientName ?? null,
    hasInternalRecord: Boolean(internal),
    externalSnippets: external?.snippets,
    osintSummary: internal?.osintSummary ?? null,
  });

  const source: PhoneLookupResult["source"] = internal && external ? "mixed" : internal ? "internal" : "external";

  return {
    phone,
    normalized,
    name: analyzed.name,
    risk_score: analyzed.risk_score,
    spam: analyzed.spam,
    notes: analyzed.notes,
    source,
  };
}
