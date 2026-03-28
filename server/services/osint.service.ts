import OpenAI from "openai";
import axios from "axios";
import { parseNumber } from "@/lib/utils";

type SearchSource = {
  title: string;
  link: string;
  snippet: string;
  source: "web" | "social" | "image" | "maps";
};

export type OsintInput = {
  clientName: string;
  phoneNumbers?: string[];
  company?: string | null;
  addresses?: string[];
  imageUrl?: string | null;
};

export type OsintResult = {
  queries: string[];
  webResults: SearchSource[];
  socialLinks: string[];
  workplace: string | null;
  imageResults: SearchSource[];
  summary: string;
  confidenceScore: number;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

function buildQueries(input: OsintInput) {
  const queries = new Set<string>();

  const name = input.clientName.trim();
  if (!name) return [];

  queries.add(name);
  queries.add(`${name} phone`);
  queries.add(`${name} workplace`);
  queries.add(`${name} company`);
  queries.add(`${name} LinkedIn`);
  queries.add(`${name} Facebook`);

  if (input.phoneNumbers?.length) {
    for (const phone of input.phoneNumbers) {
      const cleaned = phone.trim();
      if (cleaned) {
        queries.add(`${name} "${cleaned}"`);
        queries.add(`"${cleaned}"`);
      }
    }
  }

  if (input.company?.trim()) {
    queries.add(`${name} ${input.company.trim()}`);
    queries.add(`${input.company.trim()} employee ${name}`);
  }

  if (input.addresses?.length) {
    for (const address of input.addresses) {
      const cleaned = address.trim();
      if (cleaned) {
        queries.add(`${name} ${cleaned}`);
      }
    }
  }

  return Array.from(queries).slice(0, 12);
}

async function serpSearch(query: string): Promise<SearchSource[]> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) return [];

  try {
    const { data } = await axios.get("https://serpapi.com/search.json", {
      params: {
        engine: "google",
        q: query,
        api_key: apiKey,
        num: 5,
      },
      timeout: 20000,
    });

    const organicResults = Array.isArray(data?.organic_results)
      ? data.organic_results
      : [];

    return organicResults
      .map((item: any) => ({
        title: String(item?.title || ""),
        link: String(item?.link || ""),
        snippet: String(item?.snippet || ""),
        source: "web" as const,
      }))
      .filter((item: SearchSource) => item.title || item.link || item.snippet);
  } catch {
    return [];
  }
}

function extractSocialLinks(results: SearchSource[]) {
  const links = new Set<string>();

  for (const result of results) {
    const url = result.link.toLowerCase();
    const title = result.title.toLowerCase();
    const snippet = result.snippet.toLowerCase();

    const socialHints = [
      "facebook.com",
      "linkedin.com",
      "instagram.com",
      "x.com",
      "twitter.com",
      "tiktok.com",
      "youtube.com",
      "github.com",
    ];

    if (
      socialHints.some(
        (hint) => url.includes(hint) || title.includes(hint) || snippet.includes(hint)
      )
    ) {
      if (result.link) links.add(result.link);
    }
  }

  return Array.from(links).slice(0, 10);
}

function inferWorkplace(results: SearchSource[]) {
  const workplaceCandidates = results
    .map((r) => `${r.title} ${r.snippet}`)
    .join(" | ");

  const patterns = [
    /works at ([^.|,]+)/i,
    /employee at ([^.|,]+)/i,
    /at ([^.|,]+)/i,
    /company[:\s]+([^.|,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = workplaceCandidates.match(pattern);
    if (match?.[1]) {
      return match[1].trim().slice(0, 120);
    }
  }

  return null;
}

function scoreConfidence(params: {
  webResults: SearchSource[];
  socialLinks: string[];
  workplace: string | null;
  hasImage: boolean;
}) {
  let score = 0;

  score += Math.min(35, params.webResults.length * 4);
  score += Math.min(25, params.socialLinks.length * 5);
  score += params.workplace ? 15 : 0;
  score += params.hasImage ? 10 : 0;

  return Math.max(0, Math.min(100, score));
}

async function generateSummary(input: {
  clientName: string;
  webResults: SearchSource[];
  socialLinks: string[];
  workplace: string | null;
  confidenceScore: number;
}) {
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  const fallback = [
    `Client: ${input.clientName}`,
    input.workplace ? `Possible workplace: ${input.workplace}` : "No workplace confirmed",
    input.socialLinks.length
      ? `Social links found: ${input.socialLinks.length}`
      : "No strong public social matches found",
    `Confidence score: ${input.confidenceScore}/100`,
  ].join(". ");

  if (!hasOpenAI) return fallback;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an intelligence summarizer. Summarize only public-source findings in a concise, factual way. Do not invent facts.",
        },
        {
          role: "user",
          content: JSON.stringify({
            clientName: input.clientName,
            workplace: input.workplace,
            socialLinks: input.socialLinks,
            confidenceScore: input.confidenceScore,
            topResults: input.webResults.slice(0, 5),
          }),
        },
      ],
      temperature: 0.2,
    });

    const text = response.choices[0]?.message?.content?.trim();
    return text || fallback;
  } catch {
    return fallback;
  }
}

export async function runOsint(input: OsintInput): Promise<OsintResult> {
  const queries = buildQueries(input);

  const allSearchResultsNested = await Promise.all(
    queries.map(async (query) => {
      const results = await serpSearch(query);
      return results;
    })
  );

  const webResults = allSearchResultsNested.flat().slice(0, 30);
  const socialLinks = extractSocialLinks(webResults);
  const workplace = inferWorkplace(webResults);
  const confidenceScore = scoreConfidence({
    webResults,
    socialLinks,
    workplace,
    hasImage: Boolean(input.imageUrl),
  });

  const summary = await generateSummary({
    clientName: input.clientName,
    webResults,
    socialLinks,
    workplace,
    confidenceScore,
  });

  const imageResults: SearchSource[] = input.imageUrl
    ? [
        {
          title: "Image analysis placeholder",
          link: input.imageUrl,
          snippet:
            "Image uploaded and stored. Reverse-image or OCR pipeline can be connected here later.",
          source: "image",
        },
      ]
    : [];

  return {
    queries,
    webResults,
    socialLinks,
    workplace,
    imageResults,
    summary,
    confidenceScore,
  };
}

export async function buildOsintPayload(input: OsintInput) {
  const result = await runOsint(input);

  return {
    socialLinks: result.socialLinks.join("\n"),
    workplace: result.workplace,
    webResults: JSON.stringify(result.webResults),
    imageResults: JSON.stringify(result.imageResults),
    summary: result.summary,
    confidenceScore: result.confidenceScore,
  };
}

export function mergeOsintConfidence(baseScore: number, extraSignals: number) {
  return Math.max(0, Math.min(100, baseScore + parseNumber(extraSignals)));
}
