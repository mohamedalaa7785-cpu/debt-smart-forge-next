import OpenAI from "openai";

export type IdentityInput = {
  name?: string;
  phone?: string;
  city?: string;
  company?: string;
  email?: string;
  username?: string;
  aliases?: string[];
};

export type SocialCandidate = {
  platform: string;
  profileUrl: string;
  title?: string;
  snippet?: string;
  username?: string;
  city?: string;
  company?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  metadata?: Record<string, unknown>;
};

export type IdentityMatchResult = {
  confidence_score: number;
  matched_fields: string[];
  risk_level: "low" | "medium" | "high";
  reasoning: string[];
  fraud_indicators: string[];
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function normalize(v?: string) {
  return String(v || "").trim().toLowerCase();
}

function similarity(a?: string, b?: string) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.8;
  const lSet = new Set(left.split(/\s+/));
  const rSet = new Set(right.split(/\s+/));
  const overlap = [...lSet].filter((x) => rSet.has(x)).length;
  return overlap / Math.max(1, Math.max(lSet.size, rSet.size));
}

export function analyzeProfileSimilarity(input: IdentityInput, candidate: SocialCandidate) {
  const matched: string[] = [];
  const reasoning: string[] = [];
  let score = 0;

  const titleBlob = `${candidate.title || ""} ${candidate.snippet || ""}`;
  const nameSim = Math.max(similarity(input.name, candidate.title), similarity(input.name, titleBlob));
  if (nameSim > 0.95) {
    score += 30;
    matched.push("name");
    reasoning.push("Exact name match detected");
  }

  if (normalize(input.city) && (similarity(input.city, candidate.city) > 0.7 || normalize(titleBlob).includes(normalize(input.city)))) {
    score += 20;
    matched.push("city");
  }

  if (normalize(input.company) && (similarity(input.company, candidate.company) > 0.7 || normalize(titleBlob).includes(normalize(input.company)))) {
    score += 15;
    matched.push("company");
  }

  if (similarity(input.email, candidate.email) > 0.7) {
    score += 40;
    matched.push("email");
  }

  if (normalize(input.phone) && normalize(candidate.phone) && normalize(input.phone).replace(/\D/g, "") === normalize(candidate.phone).replace(/\D/g, "")) {
    score += 50;
    matched.push("phone");
  }

  if (candidate.profileImage) {
    score += 25;
    matched.push("profile_image");
  }

  const userSim = Math.max(similarity(input.username, candidate.username), ...(input.aliases || []).map((a) => similarity(a, candidate.username)));
  if (userSim > 0.7) {
    score += 10;
    matched.push("username");
  }

  return { score: Math.min(100, score), matched_fields: matched, reasoning };
}

export function detectFraudIndicators(candidate: SocialCandidate, score: number): string[] {
  const flags: string[] = [];
  const snippet = normalize(candidate.snippet);
  if (!candidate.title && !candidate.snippet) flags.push("empty_profile");
  if (snippet.includes("crypto") || snippet.includes("giveaway")) flags.push("suspicious_keywords");
  if (score < 45) flags.push("low_match_confidence");
  return flags;
}

export function calculateConfidence(input: IdentityInput, candidate: SocialCandidate): IdentityMatchResult {
  const sim = analyzeProfileSimilarity(input, candidate);
  const fraud = detectFraudIndicators(candidate, sim.score);
  const risk_level = sim.score >= 80 ? "low" : sim.score >= 50 ? "medium" : "high";
  return {
    confidence_score: sim.score,
    matched_fields: sim.matched_fields,
    risk_level,
    reasoning: sim.reasoning,
    fraud_indicators: fraud,
  };
}

export async function generateIdentitySummary(input: IdentityInput, results: Array<IdentityMatchResult & { platform: string; profileUrl: string }>) {
  if (!openai) {
    return {
      probability_real_identity: results[0]?.confidence_score || 0,
      suspicious_accounts: results.filter((r) => r.risk_level === "high").map((r) => r.profileUrl),
      fake_identity_signals: results.flatMap((r) => r.fraud_indicators),
      summary: "AI unavailable. Returned deterministic analysis.",
      customer_risk: results.some((r) => r.risk_level === "high") ? "high" : "medium",
    };
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Return JSON with keys: probability_real_identity, suspicious_accounts, fake_identity_signals, summary, customer_risk." },
      { role: "user", content: JSON.stringify({ input, results }).slice(0, 12000) },
    ],
  });

  const content = completion.choices[0]?.message?.content || "{}";
  return JSON.parse(content);
}
