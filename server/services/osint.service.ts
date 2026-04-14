// server/services/osint.service.ts

import axios from "axios";
import { uniqueArray } from "@/lib/utils";
import { db } from "@/server/db";
import { osintResults, osintHistory, clientAddresses } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* ================= CACHE ================= */

const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 10;

/* ================= TYPES ================= */

export interface OSINTInput {
  clientId?: string;
  name: string;
  phone?: string;
  company?: string;
  city?: string;
  imageUrl?: string;
}

export interface OSINTResult {
  socialLinks: string[];
  webResults: string[];
  workplace: string[];
  imageMatches: string[];
  mapsResults: string[];
  mapPlaces?: Array<{
    name: string;
    address: string;
    lat?: number;
    lng?: number;
  }>;
  summary: string;
  confidence: number;
  fraudFlags: string[];
  riskLevel: string;
}

/* ================= KEYS ================= */

const SERP_KEY = process.env.SERPAPI_API_KEY?.trim() || null;
const OPENAI_KEY = process.env.OPENAI_API_KEY?.trim() || null;
const MAPS_KEY =
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/* ================= HELPERS ================= */

function cacheKey(input: OSINTInput) {
  return `${input.name}-${input.phone}-${input.company}-${input.city}`;
}

function safeJSONParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function generateQueries(input: OSINTInput): string[] {
  const queries: string[] = [];
  const name = input.name?.trim();
  const company = input.company?.trim();
  const city = input.city?.trim();

  if (name) {
    queries.push(name);
    queries.push(`${name} LinkedIn`);
    queries.push(`${name} Facebook`);
    queries.push(`${name} CV`);
    queries.push(`${name} profile`);
  }

  if (name && company) {
    queries.push(`${name} ${company}`);
    queries.push(`${name} ${company} LinkedIn`);
    queries.push(`${name} works at ${company}`);
  }

  if (name && city) {
    queries.push(`${name} ${city}`);
    queries.push(`${name} ${city} LinkedIn`);
  }

  if (input.phone) {
    queries.push(input.phone);
    if (name) queries.push(`${name} ${input.phone}`);
  }

  if (company && city) {
    queries.push(`${company} ${city}`);
  }

  return uniqueArray(queries).slice(0, 10);
}

async function safeRequest(url: string, params: any, retries = 2) {
  try {
    const res = await axios.get(url, { params, timeout: 8000 });
    return res.data;
  } catch {
    if (retries > 0) return safeRequest(url, params, retries - 1);
    return null;
  }
}

async function runLimited(arr: any[], fn: any, limit = 2) {
  const results: any[] = [];
  for (let i = 0; i < arr.length; i += limit) {
    const chunk = arr.slice(i, i + limit);
    const res = await Promise.all(chunk.map(fn));
    results.push(...res);
  }
  return results;
}

async function syncClientAddressesFromMaps(
  clientId: string,
  places: Array<{ address: string; lat?: number; lng?: number }>
) {
  if (!places.length) return;

  const existing = await db
    .select({ address: clientAddresses.address })
    .from(clientAddresses)
    .where(eq(clientAddresses.clientId, clientId));

  const existingSet = new Set(
    existing.map((e) => e.address.trim().toLowerCase())
  );

  const toInsert = places
    .filter((p) => p.address?.trim())
    .filter((p) => !existingSet.has(p.address.trim().toLowerCase()))
    .slice(0, 5)
    .map((p, idx) => ({
      clientId,
      address: p.address.trim(),
      city: null,
      area: null,
      lat: p.lat != null ? String(p.lat) : null,
      lng: p.lng != null ? String(p.lng) : null,
      isPrimary: idx === 0 && existing.length === 0,
    }));

  if (toInsert.length) {
    await db.insert(clientAddresses).values(toInsert);
  }
}

function scoreResult(result: any, input: OSINTInput) {
  const title = String(result?.title || "").toLowerCase();
  const snippet = String(result?.snippet || "").toLowerCase();
  const link = String(result?.link || "").toLowerCase();
  const text = `${title} ${snippet} ${link}`;

  let score = 0;

  const nameParts = String(input.name || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  for (const part of nameParts) {
    if (text.includes(part)) score += 3;
  }

  if (input.company && text.includes(input.company.toLowerCase())) score += 4;
  if (input.city && text.includes(input.city.toLowerCase())) score += 2;
  if (input.phone && text.includes(input.phone.replace(/\D/g, ""))) score += 4;

  if (link.includes("linkedin.com")) score += 3;
  if (link.includes("facebook.com")) score += 2;

  return score;
}

/* ================= PROVIDERS ================= */

const searchWeb = (q: string) =>
  SERP_KEY ? safeRequest("https://serpapi.com/search.json", { q, api_key: SERP_KEY }) : null;

const searchMaps = (q: string) =>
  MAPS_KEY
    ? safeRequest("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        query: q,
        key: MAPS_KEY,
      })
    : null;

async function searchImage(url: string) {
  if (!url) return [];
  if (!SERP_KEY) return [];
  const data = await safeRequest("https://serpapi.com/search.json", {
    engine: "google_lens",
    url,
    api_key: SERP_KEY,
  });
  return data?.visual_matches || [];
}

/* ================= AI ================= */

async function analyzeAI(payload: any) {
  if (!OPENAI_KEY) return null;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Return JSON only: { riskLevel, fraudFlags[], summary }",
          },
          {
            role: "user",
            content: JSON.stringify(payload).slice(0, 3000),
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      }
    );

    const raw = res.data?.choices?.[0]?.message?.content;
    return safeJSONParse(raw || "");
  } catch {
    return null;
  }
}

/* ================= MAIN ================= */

export async function runOSINT(input: OSINTInput): Promise<OSINTResult> {
  const key = cacheKey(input);

  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const queries = generateQueries(input);

  if (!SERP_KEY && !MAPS_KEY) {
    return {
      socialLinks: [],
      webResults: [],
      workplace: [],
      imageMatches: [],
      mapsResults: [],
      mapPlaces: [],
      summary: "OSINT providers are not configured",
      confidence: 0,
      fraudFlags: ["MISSING_OSINT_KEYS"],
      riskLevel: "low",
    };
  }

  const webRaw = await runLimited(queries, searchWeb);
  const mapsRaw = await runLimited(queries, searchMaps);

  const webFlat = webRaw.flatMap((r: any) => r?.organic_results || []);
  const knowledgeGraph = webRaw
    .map((r: any) => r?.knowledge_graph)
    .filter(Boolean);
  const mapsFlat = mapsRaw.flatMap((r: any) => r?.results || []);

  const rankedWeb = webFlat
    .map((item: any) => ({ ...item, __score: scoreResult(item, input) }))
    .filter((item: any) => item.__score >= 2)
    .sort((a: any, b: any) => b.__score - a.__score)
    .slice(0, 30);

  const social = rankedWeb
    .map((r: any) => r.link)
    .filter((l: string) => l?.includes("facebook") || l?.includes("linkedin"));

  const links = rankedWeb.map((r: any) => r.link).filter(Boolean);

  const workplaceFromOrganic = rankedWeb
    .map((r: any) => `${r.title || ""} ${r.snippet || ""}`.trim())
    .filter((s: string) =>
      /works?|employee|manager|director|engineer|owner|founder/i.test(s)
    );

  const workplaceFromKg = knowledgeGraph
    .map((k: any) => [k?.title, k?.type, k?.description].filter(Boolean).join(" - "))
    .filter(Boolean);

  const workplace = uniqueArray([...workplaceFromOrganic, ...workplaceFromKg]).slice(0, 12);

  const mapPlaces = mapsFlat
    .map((m: any) => ({
      name: m?.name || "",
      address: m?.formatted_address || "",
      lat: m?.geometry?.location?.lat,
      lng: m?.geometry?.location?.lng,
    }))
    .filter((m: any) => m.name || m.address);

  const mapsResults = uniqueArray(
    mapPlaces.map((m: any) =>
      [m.name, m.address].filter(Boolean).join(" - ")
    )
  ).slice(0, 20);

  const imageMatches = input.imageUrl
    ? (await searchImage(input.imageUrl)).map((i: any) => i.link)
    : [];

  const fraudFlags = [];
  if (!social.length) fraudFlags.push("NO_SOCIAL");

  const ai = await analyzeAI({ social, links, mapsResults });

  const confidence = Math.min(100, social.length * 20 + links.length * 5);

  const result: OSINTResult = {
    socialLinks: social,
    webResults: links,
    workplace,
    imageMatches,
    mapsResults,
    mapPlaces,
    summary: ai?.summary || "No strong signals",
    confidence,
    fraudFlags,
    riskLevel: ai?.riskLevel || "low",
  };

  if (input.clientId) {
    try {
      await syncClientAddressesFromMaps(
        input.clientId,
        mapPlaces
          .map((m: any) => ({
            address: m.address,
            lat: m.lat,
            lng: m.lng,
          }))
          .filter((m: any) => m.address)
      );

      await db
        .insert(osintResults)
        .values({
          clientId: input.clientId,
          social,
          workplace,
          webResults: links,
          imageResults: imageMatches,
          mapsResults,
          summary: result.summary,
          confidenceScore: result.confidence,
          riskLevel: result.riskLevel,
          fraudFlags,
          updatedAt: new Date(),
          lastAnalyzedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: osintResults.clientId,
          set: {
            social,
            workplace,
            webResults: links,
            imageResults: imageMatches,
            mapsResults,
            summary: result.summary,
            confidenceScore: result.confidence,
            riskLevel: result.riskLevel,
            fraudFlags,
            updatedAt: new Date(),
            lastAnalyzedAt: new Date(),
          },
        });

      await db.insert(osintHistory).values({
        clientId: input.clientId,
        result,
        confidence: result.confidence,
      });
    } catch (err) {
      console.error("OSINT SAVE ERROR:", err);
    }
  }

  cache.set(key, { data: result, expiry: Date.now() + TTL });

  return result;
  }
