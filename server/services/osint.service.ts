import axios from "axios";
import { uniqueArray } from "@/lib/utils";
import { db } from "@/server/db";
import { osintResults, osintHistory } from "@/server/db/schema";
import { getRequiredEnv } from "@/lib/env";

/* =========================
   CACHE
========================= */
const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 10;

/* =========================
   TYPES
========================= */
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
}

/* =========================
   KEYS
========================= */
const SERP_KEY = getRequiredEnv("SERPAPI_API_KEY");
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/* =========================
   HELPERS
========================= */

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

async function safeRequest(url: string, params: any) {
  try {
    const res = await axios.get(url, { params, timeout: 8000 });
    return res.data;
  } catch (err: any) {
    console.warn("OSINT request failed:", err?.message);
    return null;
  }
}

/* =========================
   PROVIDERS
========================= */

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
    {
      query,
      key: MAPS_KEY,
    }
  );

  return data?.results?.slice(0, 3) || [];
}

async function analyzeAI(payload: any) {
  if (!OPENAI_KEY) return "";

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Analyze OSINT data. Return: risk level (low/medium/high), fraud signals, short summary.",
          },
          {
            role: "user",
            content: JSON.stringify(payload).slice(0, 3000),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
        },
      }
    );

    return res.data?.choices?.[0]?.message?.content || "";
  } catch {
    return "";
  }
}

/* =========================
   EXTRACT
========================= */

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
      l.includes("instagram") ||
      l.includes("twitter")
    ) {
      social.add(link);
    }

    if (r?.snippet) {
      const text = r.snippet.toLowerCase();

      if (
        text.includes("works at") ||
        text.includes("company") ||
        text.includes("employee")
      ) {
        workplace.add(r.snippet);
      }
    }
  }

  return {
    social: Array.from(social).slice(0, 5),
    workplace: Array.from(workplace).slice(0, 5),
    links: Array.from(links).slice(0, 10),
  };
}

/* =========================
   SCORING
========================= */

function calculateScore(data: any, aiText: string) {
  let score = 0;

  if (data.social.length) score += 30;
  if (data.workplace.length) score += 20;
  if (data.links.length) score += 10;
  if (data.maps?.length) score += 20;

  if (aiText.toLowerCase().includes("fraud")) score += 30;

  return Math.min(score, 100);
}

function detectRiskLevel(score: number) {
  if (score > 70) return "high";
  if (score > 40) return "medium";
  return "low";
}

/* =========================
   MAIN 🔥
========================= */

export async function runOSINT(input: OSINTInput): Promise<OSINTResult> {
  const cacheKey = JSON.stringify(input);

  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const queries = generateQueries(input);

  const [webRaw, mapsRaw, imageRaw] = await Promise.all([
    Promise.all(queries.map((q) => searchWeb(q))),
    Promise.all(queries.map((q) => searchMaps(q))),
    input.imageUrl ? searchImage(input.imageUrl) : [],
  ]);

  const webFlat = webRaw.flat();
  const mapsFlat = mapsRaw.flat();

  const extracted = extractData(webFlat);

  const mapsResults = mapsFlat.map((m: any) => m?.name).filter(Boolean);
  const imageMatches = imageRaw.map((i: any) => i?.link).filter(Boolean);

  const aiText = await analyzeAI({
    web: extracted,
    maps: mapsResults,
    images: imageMatches,
  });

  const confidence = calculateScore(
    { ...extracted, maps: mapsResults },
    aiText
  );

  const riskLevel = detectRiskLevel(confidence);

  const result: OSINTResult = {
    socialLinks: extracted.social,
    webResults: extracted.links,
    workplace: extracted.workplace,
    imageMatches,
    mapsResults,
    summary: aiText || "No strong signals detected",
    confidence,
  };

  /* ================= SAVE ================= */

  if (input.clientId) {
    try {
      /* 🔥 MAIN RESULT */
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
          riskLevel,
          fraudFlags: [],
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
            riskLevel,
          },
        });

      /* 🔥 HISTORY */
      await db.insert(osintHistory).values({
        clientId: input.clientId,
        result,
        confidence: result.confidence,
      });
    } catch (err) {
      console.error("OSINT SAVE ERROR:", err);
    }
  }

  cache.set(cacheKey, {
    data: result,
    expiry: Date.now() + TTL,
  });

  return result;
     }
