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

  /* 🔥 ENTERPRISE ADDITIONS */
  riskBoost: number;
  urgency: number;
}

/* =========================
   SAFE NUMBER
========================= */
function safeNumber(val: any, fallback = 0) {
  const n = parseNumber(val);
  return isNaN(n) ? fallback : n;
}

/* =========================
   FALLBACK ENGINE 🔥 (SMART)
========================= */
function fallbackAI(input: AIInput): AIResult {
  const risk = safeNumber(input.riskScore);
  const osint = safeNumber(input.osintConfidence);
  const inactivity = safeNumber(input.lastActionDays);

  let probability = 50;

  probability += osint * 0.3;
  probability -= risk * 0.5;
  probability -= inactivity * 2;

  probability += (input.phonesCount ?? 0) * 4;
  probability += (input.addressesCount ?? 0) * 2;

  probability = Math.max(0, Math.min(100, Math.round(probability)));

  /* =========================
     TONE ENGINE
  ========================= */
  let tone: Tone = "balanced";

  if (risk > 90) tone = "aggressive";
  else if (risk > 70) tone = "firm";
  else if (probability > 70) tone = "soft";

  /* =========================
     DECISION ENGINE
  ========================= */
  let behaviorPrediction = "";
  let strategy = "";
  let nextAction = "";

  if (probability > 75) {
    behaviorPrediction = "High likelihood of immediate payment";
    strategy = "Close quickly with minimal friction";
    nextAction = "Confirm payment and follow up";
  } else if (probability > 45) {
    behaviorPrediction = "Moderate chance of payment with follow-up";
    strategy = "Consistent reminders and structured negotiation";
    nextAction = "Call + WhatsApp follow-up";
  } else {
    behaviorPrediction = "High risk of avoidance or delay";
    strategy = "Apply pressure and escalate if needed";
    nextAction = "Firm call and log outcome";
  }

  /* =========================
     FLAGS
  ========================= */
  const redFlags: string[] = [];
  if (!input.phonesCount) redFlags.push("No phone");
  if (!input.addressesCount) redFlags.push("No address");
  if (inactivity > 5) redFlags.push("Inactive client");

  const strengths: string[] = [];
  if (osint > 60) strengths.push("Strong OSINT");
  if (input.phonesCount) strengths.push("Reachable");

  /* =========================
     META
  ========================= */
  const confidence = Math.round((osint + (100 - risk)) / 2);

  const riskBoost = Math.max(0, Math.round((100 - probability) / 10));
  const urgency = Math.min(100, risk + inactivity * 2);

  return {
    behaviorPrediction,
    paymentProbability: probability,
    strategy,
    tone,
    nextAction,
    summary: `${behaviorPrediction}. Strategy: ${strategy}.`,
    confidence,
    redFlags,
    strengths,
    riskBoost,
    urgency,
  };
}

/* =========================
   OPENAI CALL 🔥
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
            "You are a debt collection AI decision engine. Return ONLY JSON with keys: behaviorPrediction, paymentProbability, strategy, tone, nextAction, summary, confidence, redFlags, strengths, riskBoost, urgency.",
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
      paymentProbability: safeNumber(parsed.paymentProbability),
      confidence: safeNumber(parsed.confidence),
      riskBoost: safeNumber(parsed.riskBoost),
      urgency: safeNumber(parsed.urgency),
    };
  } catch (error) {
    console.error("AI ERROR:", error);
    return null;
  }
}

/* =========================
   MAIN ENTRY
========================= */
export async function analyzeClient(
  input: AIInput
): Promise<AIResult> {
  const ai = await runAI(input);

  if (ai) return ai;

  return fallbackAI(input);
}

/* =========================
   PRIORITY BOOST 🔥
========================= */
export function getCallPriority(ai: AIResult, riskScore: number) {
  return Math.round(
    ai.paymentProbability * 0.3 +
      riskScore * 0.5 +
      ai.urgency * 0.2
  );
}
