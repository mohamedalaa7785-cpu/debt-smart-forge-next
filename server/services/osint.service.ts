import axios from "axios";
import { safeJsonParse, uniqueArray } from "@/lib/utils";

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
   GENERATE SEARCH QUERIES
========================= */
function generateQueries(input: OSINTInput): string[] {
  const queries: string[] = [];

  if (input.name) {
    queries.push(input.name);
    queries.push(`${input.name} Facebook`);
    queries.push(`${input.name} LinkedIn`);
  }

  if (input.phone) {
    queries.push(`${input.phone}`);
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
   SERP API SEARCH
========================= */
async function searchWeb(query: string) {
  try {
    const res = await axios.get("https://serpapi.com/search.json", {
      params: {
        q: query,
        api_key: process.env.SERPAPI_API_KEY,
      },
    });

    return res.data?.organic_results || [];
  } catch {
    return [];
  }
}

/* =========================
   IMAGE SEARCH (BASIC)
========================= */
async function searchImage(imageUrl: string) {
  try {
    const res = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google_lens",
        url: imageUrl,
        api_key: process.env.SERPAPI_API_KEY,
      },
    });

    return res.data?.visual_matches || [];
  } catch {
    return [];
  }
}

/* =========================
   EXTRACT DATA
========================= */
function extractData(results: any[]) {
  const social: string[] = [];
  const workplace: string[] = [];
  const links: string[] = [];

  for (const r of results) {
    const link = r.link || "";

    if (!link) continue;

    links.push(link);

    if (
      link.includes("facebook") ||
      link.includes("linkedin") ||
      link.includes("instagram")
    ) {
      social.push(link);
    }

    if (r.snippet) {
      if (
        r.snippet.toLowerCase().includes("works at") ||
        r.snippet.toLowerCase().includes("company")
      ) {
        workplace.push(r.snippet);
      }
    }
  }

  return {
    social: uniqueArray(social),
    workplace: uniqueArray(workplace),
    links: uniqueArray(links),
  };
}

/* =========================
   AI SUMMARY (LIGHT)
========================= */
function buildSummary(data: {
  social: string[];
  workplace: string[];
}) {
  let summary = "";

  if (data.social.length > 0) {
    summary += "Social profiles found. ";
  }

  if (data.workplace.length > 0) {
    summary += "Possible workplace detected. ";
  }

  if (!summary) {
    summary = "Limited online presence.";
  }

  return summary;
}

/* =========================
   CONFIDENCE SCORE
========================= */
function calculateConfidence(data: {
  social: string[];
  workplace: string[];
  images: string[];
}) {
  let score = 0;

  score += data.social.length * 20;
  score += data.workplace.length * 15;
  score += data.images.length * 10;

  return Math.min(100, score);
}

/* =========================
   MAIN OSINT FUNCTION
========================= */
export async function runOSINT(
  input: OSINTInput
): Promise<OSINTResult> {
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
  });

  /* =========================
     CONFIDENCE
  ========================= */
  const confidence = calculateConfidence({
    social: extracted.social,
    workplace: extracted.workplace,
    images: imageMatches,
  });

  return {
    socialLinks: extracted.social,
    webResults: extracted.links,
    workplace: extracted.workplace,
    imageMatches,

    summary,
    confidence,
  };
}
