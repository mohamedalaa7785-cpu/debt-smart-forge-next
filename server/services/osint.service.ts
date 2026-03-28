import axios from "axios";
import { uniqueArray } from "@/lib/utils";

/* =========================
   CACHE (MEMORY)
========================= */
const cache = new Map<string, any>();

/* =========================
   TYPES
========================= */
export interface OSINTInput {
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
   GENERATE QUERIES
========================= */
function generateQueries(input: OSINTInput): string[] {
  const queries: string[] = [];

  if (input.name) {
    queries.push(input.name);
    queries.push(`${input.name} Facebook`);
    queries.push(`${input.name} LinkedIn`);
  }

  if (input.phone) {
    queries.push(input.phone);
    queries.push(`${input.name} ${input.phone}`);
  }

  if (input.company) {
    queries.push(`${input.name} ${input.company}`);
  }

  if (input.city) {
    queries.push(`${input.name} ${input.city}`);
  }

  return uniqueArray(queries);
}

/* =========================
   SAFE REQUEST (TIMEOUT)
========================= */
async function safeRequest(url: string, params: any) {
  try {
    const res = await axios.get(url, {
      params,
      timeout: 8000, // 🔥 مهم
    });

    return res.data;
  } catch {
    return null;
  }
}

/* =========================
   WEB SEARCH
========================= */
async function searchWeb(query: string) {
  const data = await safeRequest(
    "https://serpapi.com/search.json",
    {
      q: query,
      api_key: process.env.SERPAPI_API_KEY,
    }
  );

  return data?.organic_results || [];
}

/* =========================
   IMAGE SEARCH
========================= */
async function searchImage(imageUrl: string) {
  const data = await safeRequest(
    "https://serpapi.com/search.json",
    {
      engine: "google_lens",
      url: imageUrl,
      api_key: process.env.SERPAPI_API_KEY,
    }
  );

  return data?.visual_matches || [];
}

/* =========================
   EXTRACT DATA (SMART)
========================= */
function extractData(results: any[]) {
  const social = new Set<string>();
  const workplace = new Set<string>();
  const links = new Set<string>();

  for (const r of results) {
    const link = r.link || "";
    if (!link) continue;

    links.add(link);

    const lower = link.toLowerCase();

    if (
      lower.includes("facebook") ||
      lower.includes("linkedin") ||
      lower.includes("instagram") ||
      lower.includes("twitter")
    ) {
      social.add(link);
    }

    if (r.snippet) {
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
    social: Array.from(social),
    workplace: Array.from(workplace),
    links: Array.from(links),
  };
}

/* =========================
   SUMMARY ENGINE
========================= */
function buildSummary(data: {
  social: string[];
  workplace: string[];
  images: string[];
}) {
  if (data.social.length && data.workplace.length) {
    return "Strong digital footprint with identifiable workplace.";
  }

  if (data.social.length) {
    return "Social presence detected.";
  }

  if (data.images.length) {
    return "Image matches found online.";
  }

  return "Low online presence.";
}

/* =========================
   CONFIDENCE ENGINE 🔥
========================= */
function calculateConfidence(data: {
  social: string[];
  workplace: string[];
  images: string[];
}) {
  let score = 0;

  score += data.social.length * 25;
  score += data.workplace.length * 20;
  score += data.images.length * 15;

  return Math.min(100, score);
}

/* =========================
   MAIN FUNCTION 🔥🔥🔥
========================= */
export async function runOSINT(
  input: OSINTInput
): Promise<OSINTResult> {
  const key = JSON.stringify(input);

  /* =========================
     CACHE HIT
  ========================= */
  if (cache.has(key)) {
    return cache.get(key);
  }

  const queries = generateQueries(input);

  /* =========================
     WEB SEARCH
  ========================= */
  const webResultsRaw = await Promise.all(
    queries.map((q) => searchWeb(q))
  );

  const flatResults = webResultsRaw.flat();

  const extracted = extractData(flatResults);

  /* =========================
     IMAGE SEARCH
  ========================= */
  let imageMatches: string[] = [];

  if (input.imageUrl) {
    const images = await searchImage(input.imageUrl);
    imageMatches = images.map((i: any) => i.link);
  }

  /* =========================
     SUMMARY
  ========================= */
  const summary = buildSummary({
    social: extracted.social,
    workplace: extracted.workplace,
    images: imageMatches,
  });

  /* =========================
     CONFIDENCE
  ========================= */
  const confidence = calculateConfidence({
    social: extracted.social,
    workplace: extracted.workplace,
    images: imageMatches,
  });

  const result: OSINTResult = {
    socialLinks: extracted.social,
    webResults: extracted.links,
    workplace: extracted.workplace,
    imageMatches,
    summary,
    confidence,
  };

  /* =========================
     SAVE CACHE
  ========================= */
  cache.set(key, result);

  return result;
}
