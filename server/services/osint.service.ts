// server/services/osint.service.ts

import axios from "axios";
import { uniqueArray } from "@/lib/utils";
import { db } from "@/server/db";
import { osintResults, osintHistory } from "@/server/db/schema";
import { getRequiredEnv } from "@/lib/env";

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
  summary: string;
  confidence: number;
  fraudFlags: string[];
  riskLevel: string;
}

/* ================= KEYS ================= */

const SERP_KEY = getRequiredEnv("SERPAPI_API_KEY");
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  if (input.name) {
    queries.push(input.name);
    queries.push(`${input.name} Facebook`);
    queries.push(`${input.name} LinkedIn`);
  }

  if (input.phone) queries.push(input.phone);
  if (input.company) queries.push(`${input.name} ${input.company}`);

  return uniqueArray(queries).slice(0, 5);
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

/* ================= PROVIDERS ================= */

const searchWeb = (q: string) =>
  safeRequest("https://serpapi.com/search.json", { q, api_key: SERP_KEY });

const searchMaps = (q: string) =>
  MAPS_KEY
    ? safeRequest("https://maps.googleapis.com/maps/api/place/textsearch/json", {
        query: q,
        key: MAPS_KEY,
      })
    : null;

async function searchImage(url: string) {
  if (!url) return [];
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

  const webRaw = await runLimited(queries, searchWeb);
  const mapsRaw = await runLimited(queries, searchMaps);

  const webFlat = webRaw.flatMap((r: any) => r?.organic_results || []);
  const mapsFlat = mapsRaw.flatMap((r: any) => r?.results || []);

  const social = webFlat
    .map((r: any) => r.link)
    .filter((l: string) => l?.includes("facebook") || l?.includes("linkedin"));

  const links = webFlat.map((r: any) => r.link).filter(Boolean);
  const workplace = webFlat
    .map((r: any) => r.snippet)
    .filter((s: string) => s?.toLowerCase().includes("works"));

  const mapsResults = mapsFlat.map((m: any) => m.name).filter(Boolean);

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
    summary: ai?.summary || "No strong signals",
    confidence,
    fraudFlags,
    riskLevel: ai?.riskLevel || "low",
  };

  if (input.clientId) {
    try {
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
