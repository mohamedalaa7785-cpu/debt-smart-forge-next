import axios from "axios";
import { uniqueArray } from "@/lib/utils";
import { db } from "@/server/db";
import { osintResults, osintHistory } from "@/server/db/schema";
import { getRequiredEnv } from "@/lib/env";

/* ================= CACHE ================= */

const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 10;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (v.expiry < now) cache.delete(k);
  }
}, 60000);

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

/* 🔥 RETRY */
async function safeRequest(url: string, params: any, retries = 2) {
  try {
    const res = await axios.get(url, { params, timeout: 8000 });
    return res.data;
  } catch (err) {
    if (retries > 0) {
      return safeRequest(url, params, retries - 1);
    }
    return null;
  }
}

/* ================= PROVIDERS ================= */

async function searchWeb(query: string) {
  const data = await safeRequest("https://serpapi.com/search.json", {
    q: query,
    api_key: SERP_KEY,
  });

  return data?.organic_results?.slice(0, 5) || [];
}

async function searchImage(imageUrl: string) {
  if (!imageUrl) return [];

  const data = await safeRequest("https://serpapi.com/search.json", {
    engine: "google_lens",
    url: imageUrl,
    api_key: SERP_KEY,
  });

  return data?.visual_matches?.slice(0, 5) || [];
}

async function searchMaps(query: string) {
  if (!MAPS_KEY) return [];

  const data = await safeRequest(
    "https://maps.googleapis.com/maps/api/place/textsearch/json",
    { query, key: MAPS_KEY }
  );

  return data?.results?.slice(0, 3) || [];
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

    return JSON.parse(
      res.data?.choices?.[0]?.message?.content || "{}"
    );
  } catch {
    return null;
  }
}

/* ================= EXTRACT ================= */

function extractData(results: any[]) {
  const social = new Set<string>();
  const workplace = new Set<string>();
  const links = new Set<string>();

  for (const r of results) {
    const link = r?.link;
    if (!link) continue;

    links.add(link);

    const l = link.toLowerCase();

    if (
      l.includes("facebook") ||
      l.includes("linkedin") ||
      l.includes("instagram")
    ) {
      social.add(link);
    }

    if (r?.snippet?.toLowerCase().includes("works")) {
      workplace.add(r.snippet);
    }
  }

  return {
    social: Array.from(social),
    workplace: Array.from(workplace),
    links: Array.from(links),
  };
}

/* ================= FRAUD DETECTION ================= */

function detectFraudSignals(data: any) {
  const flags: string[] = [];

  if (!data.social.length) flags.push("NO_SOCIAL_PRESENCE");
  if (!data.workplace.length) flags.push("NO_WORK_HISTORY");
  if (data.links.length < 3) flags.push("LOW_WEB_FOOTPRINT");

  return flags;
}

/* ================= SCORE ================= */

function calculateScore(data: any, flags: string[]) {
  let score = 0;

  if (data.social.length) score += 30;
  if (data.workplace.length) score += 20;
  if (data.links.length) score += 10;
  if (data.maps?.length) score += 20;

  score += flags.length * 10;

  return Math.min(score, 100);
}

/* ================= MAIN ================= */

export async function runOSINT(input: OSINTInput): Promise<OSINTResult> {
  const cacheKey = JSON.stringify(input);

  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const queries = generateQueries(input);

  const [webRaw, mapsRaw, imageRaw] = await Promise.all([
    Promise.all(queries.map(searchWeb)),
    Promise.all(queries.map(searchMaps)),
    input.imageUrl ? searchImage(input.imageUrl) : [],
  ]);

  const webFlat = webRaw.flat();
  const mapsFlat = mapsRaw.flat();

  const extracted = extractData(webFlat);

  const mapsResults = mapsFlat.map((m: any) => m?.name).filter(Boolean);
  const imageMatches = imageRaw.map((i: any) => i?.link).filter(Boolean);

  const fraudFlags = detectFraudSignals(extracted);

  const ai = await analyzeAI({
    web: extracted,
    maps: mapsResults,
    images: imageMatches,
  });

  const confidence = calculateScore(
    { ...extracted, maps: mapsResults },
    fraudFlags
  );

  const result: OSINTResult = {
    socialLinks: extracted.social,
    webResults: extracted.links,
    workplace: extracted.workplace,
    imageMatches,
    mapsResults,
    summary: ai?.summary || "No strong signals",
    confidence,
    fraudFlags,
    riskLevel: ai?.riskLevel || "low",
  };

  /* ================= SAVE ================= */

  if (input.clientId) {
    await db
      .insert(osintResults)
      .values({
        clientId: input.clientId,
        social: result.socialLinks,
        workplace: result.workplace,
        webResults: result.webResults,
        imageResults: result.imageMatches,
        mapsResults: result.mapsResults,
        summary: result.summary,
        confidenceScore: result.confidence,
        riskLevel: result.riskLevel,
        fraudFlags: result.fraudFlags,
      })
      .onConflictDoUpdate({
        target: osintResults.clientId,
        set: {
          social: result.socialLinks,
          workplace: result.workplace,
          webResults: result.webResults,
          imageResults: result.imageMatches,
          mapsResults: result.mapsResults,
          summary: result.summary,
          confidenceScore: result.confidence,
          riskLevel: result.riskLevel,
          fraudFlags: result.fraudFlags,
        },
      });

    await db.insert(osintHistory).values({
      clientId: input.clientId,
      result,
      confidence: result.confidence,
    });
  }

  cache.set(cacheKey, {
    data: result,
    expiry: Date.now() + TTL,
  });

  return result;
     }
