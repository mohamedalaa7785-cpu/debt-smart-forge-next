import OpenAI from "openai";
import { safeJsonParse, parseNumber } from "@/lib/utils";

/* =========================
   OPENAI INIT
========================= */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

/* =========================
   TYPES
========================= */
export type Tone = "soft" | "balanced" | "firm" | "aggressive";

export interface AIInput {
  clientName: string;

  totalAmountDue?: number;
  totalBalance?: number;
  riskScore?: number;
  riskLabel?: string;

  lastActionDays?: number;

  phonesCount?: number;
  addressesCount?: number;
  loansCount?: number;

  osintConfidence?: number;
  osintSummary?: string | null;

  loanTypes?: string[];
}

export interface AIResult {
  behaviorPrediction: string;
  paymentProbability: number;
  strategy: string;
  tone: Tone;
  nextAction: string;
  summary: string;
  confidence: number;
  redFlags: string[];
  strengths: string[];
}

/* =========================
   FALLBACK ENGINE (SMART)
========================= */
function fallbackAI(input: AIInput): AIResult {
  const risk = parseNumber(input.riskScore ?? 0);
  const osint = parseNumber(input.osintConfidence ?? 0);
  const inactivity = parseNumber(input.lastActionDays ?? 0);

  let probability = 50;

  probability += osint * 0.2;
  probability -= risk * 0.4;
  probability -= inactivity * 2;

  probability += (input.phonesCount ?? 0) * 3;
  probability += (input.addressesCount ?? 0) * 2;

  probability = Math.max(0, Math.min(100, Math.round(probability)));

  let tone: Tone = "balanced";

  if (risk > 80) tone = "aggressive";
  else if (risk > 60) tone = "firm";
  else if (probability > 70) tone = "soft";

  const behaviorPrediction =
    probability > 70
      ? "Likely to pay quickly with minimal pressure"
      : probability > 40
        ? "May pay after follow-up"
        : "High chance of delay or avoidance";

  const strategy =
    probability > 70
      ? "Quick close call"
      : probability > 40
        ? "Structured follow-up"
        : "Pressure and escalation";

  const nextAction =
    probability > 70
      ? "Confirm payment date"
      : probability > 40
        ? "Call + WhatsApp reminder"
        : "Firm call + log outcome";

  const redFlags: string[] = [];
  if ((input.phonesCount ?? 0) === 0) redFlags.push("No phone");
  if ((input.addressesCount ?? 0) === 0) redFlags.push("No address");
  if (inactivity > 7) redFlags.push("No recent action");

  const strengths: string[] = [];
  if (osint > 50) strengths.push("Strong OSINT data");
  if ((input.phonesCount ?? 0) > 0) strengths.push("Reachable");

  return {
    behaviorPrediction,
    paymentProbability: probability,
    strategy,
    tone,
    nextAction,
    summary: `${behaviorPrediction}. Strategy: ${strategy}.`,
    confidence: Math.round((osint + (100 - risk)) / 2),
    redFlags,
    strengths,
  };
}

/* =========================
   OPENAI CALL
========================= */
async function runAI(input: AIInput): Promise<AIResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a debt collection AI. Return ONLY JSON with: behaviorPrediction, paymentProbability, strategy, tone, nextAction, summary, confidence, redFlags, strengths.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";

    const parsed = safeJsonParse<AIResult | null>(text, null);

    if (!parsed) return null;

    return {
      ...parsed,
      paymentProbability: parseNumber(parsed.paymentProbability),
      confidence: parseNumber(parsed.confidence),
    };
  } catch {
    return null;
  }
}

/* =========================
   MAIN FUNCTION
========================= */
export async function analyzeClient(input: AIInput): Promise<AIResult> {
  const ai = await runAI(input);

  if (ai) return ai;

  return fallbackAI(input);
}

/* =========================
   QUICK DECISION HELPER
========================= */
export function getCallPriority(ai: AIResult, riskScore: number) {
  return (
    ai.paymentProbability * 0.4 +
    riskScore * 0.6
  );
}
