import axios from "axios";
import { uniqueArray } from "@/lib/utils";
import { db } from "@/server/db";
import { osintResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   CACHE (TTL SAFE)
========================= */
const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 10; // 10 min

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
  summary: string;
  confidence: number;
}

/* =========================
   SAFE GET KEY (LAZY)
========================= */
function getApiKey() {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) {
    console.warn("⚠️ SERPAPI_API_KEY missing");
    return null;
  }
  return key;
}

/* =========================
   GENERATE QUERIES (LIMITED)
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

/* =========================
   SAFE REQUEST (RETRY + TIMEOUT)
========================= */
async function safeRequest(url: string, params: any) {
  try {
    const res = await axios.get(url, { params, timeout: 7000 });
    return res.data;
  } catch (error: any) {
    console.warn("OSINT request failed:", error?.message);
    return null;
  }
}

/* =========================
   WEB SEARCH
========================= */
async function searchWeb(query: string) {
  const key = getApiKey();
  if (!key) return [];
  const data = await safeRequest("https://serpapi.com/search.json", { q: query, api_key: key });
  return data?.organic_results?.slice(0, 5) || [];
}

/* =========================
   IMAGE SEARCH (CONTROLLED)
========================= */
async function searchImage(imageUrl: string) {
  const key = getApiKey();
  if (!key || !imageUrl) return [];
  const data = await safeRequest("https://serpapi.com/search.json", { engine: "google_lens", url: imageUrl, api_key: key });
  return data?.visual_matches?.slice(0, 5) || [];
}

/* =========================
   EXTRACT DATA
========================= */
function extractData(results: any[]) {
  const social = new Set<string>();
  const workplace = new Set<string>();
  const links = new Set<string>();
  for (const r of results) {
    const link = r?.link;
    if (!link) continue;
    links.add(link);
    const lower = link.toLowerCase();
    if (lower.includes("facebook") || lower.includes("linkedin") || lower.includes("instagram") || lower.includes("twitter")) {
      social.add(link);
    }
    if (r?.snippet) {
      const text = r.snippet.toLowerCase();
      if (text.includes("works at") || text.includes("company") || text.includes("employee")) {
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
   MAIN FUNCTION 🔥
========================= */
export async function runOSINT(input: OSINTInput): Promise<OSINTResult> {
  const cacheKey = JSON.stringify(input);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) return cached.data;

  const queries = generateQueries(input);
  const webResultsRaw = await Promise.all(queries.map((q) => searchWeb(q)));
  const flatResults = webResultsRaw.flat();
  const extracted = extractData(flatResults);

  let imageMatches: string[] = [];
  if (input.imageUrl) {
    const images = await searchImage(input.imageUrl);
    imageMatches = images.map((i: any) => i?.link).filter(Boolean);
  }

  const summary = extracted.social.length ? "Social presence detected." : "Low online presence.";
  const confidence = Math.min(100, extracted.social.length * 25 + extracted.workplace.length * 20);

  const result: OSINTResult = {
    socialLinks: extracted.social,
    webResults: extracted.links,
    workplace: extracted.workplace,
    imageMatches,
    summary,
    confidence,
  };

  // Save to DB if clientId provided
  if (input.clientId) {
    try {
      await db.insert(osintResults).values({
        clientId: input.clientId,
        social: extracted.social,
        workplace: extracted.workplace,
        webResults: extracted.links,
        imageResults: imageMatches,
        summary,
        confidenceScore: confidence.toString()
      }).onConflictDoUpdate({
        target: osintResults.clientId,
        set: { social: extracted.social, workplace: extracted.workplace, webResults: extracted.links, imageResults: imageMatches, summary, confidenceScore: confidence.toString() }
      });
    } catch (dbError) {
      console.error("OSINT DB SAVE ERROR:", dbError);
    }
  }

  cache.set(cacheKey, { data: result, expiry: Date.now() + TTL });
  return result;
}
