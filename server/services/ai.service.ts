import OpenAI from "openai";
import { safeJsonParse, parseNumber } from "@/lib/utils";
import { getRequiredEnv } from "@/lib/env";
import { z } from "zod";

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({ apiKey: getRequiredEnv("OPENAI_API_KEY") });
  }
  return openai;
}

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
  aiSignalsScore?: number;
  behaviorType?: string;
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
  riskBoost: number;
  urgency: number;
}

export interface CallScript {
  opening: string;
  mainBody: string;
  objectionHandling: string[];
  closing: string;
  whatsappMessage: string;
}

const AIResultSchema = z.object({
  behaviorPrediction: z.string().min(3),
  paymentProbability: z.number().min(0).max(100),
  strategy: z.string().min(3),
  tone: z.enum(["soft", "balanced", "firm", "aggressive"]),
  nextAction: z.string().min(2),
  summary: z.string().min(3),
  confidence: z.number().min(0).max(100),
  redFlags: z.array(z.string()).default([]),
  strengths: z.array(z.string()).default([]),
  riskBoost: z.number(),
  urgency: z.number().min(0).max(100),
});

const CallScriptSchema = z.object({
  opening: z.string().min(3),
  mainBody: z.string().min(3),
  objectionHandling: z.array(z.string()).min(1),
  closing: z.string().min(3),
  whatsappMessage: z.string().min(3),
});

function safeNumber(val: any, fallback = 0) {
  const n = parseNumber(val);
  return isNaN(n) ? fallback : n;
}

function fallbackAI(input: AIInput): AIResult {
  const risk = safeNumber(input.riskScore);
  const osint = safeNumber(input.osintConfidence);
  const inactivity = safeNumber(input.lastActionDays);
  const signals = safeNumber(input.aiSignalsScore);

  let probability = 50 + osint * 0.3 - risk * 0.5 - inactivity * 2 + signals * 0.5;
  probability += (input.phonesCount ?? 0) * 4;
  probability += (input.addressesCount ?? 0) * 2;
  probability = Math.max(0, Math.min(100, Math.round(probability)));

  let tone: Tone = "balanced";
  if (risk > 90) tone = "aggressive";
  else if (risk > 70) tone = "firm";
  else if (probability > 70) tone = "soft";

  const behaviorPrediction =
    probability > 75
      ? "Client likely to pay immediately"
      : probability > 45
      ? "Client may pay with structured follow-up"
      : "Client likely to delay or avoid";

  const strategy =
    probability > 75
      ? "Close quickly with minimal resistance"
      : probability > 45
      ? "Consistent reminders + negotiation"
      : "Pressure + escalation";

  const nextAction = probability > 75 ? "Confirm payment and follow-up" : probability > 45 ? "Call + WhatsApp" : "Firm call + log outcome";

  const redFlags: string[] = [];
  if (!input.phonesCount) redFlags.push("No phone");
  if (!input.addressesCount) redFlags.push("No address");
  if (inactivity > 5) redFlags.push("Inactive");

  const strengths: string[] = [];
  if (osint > 60) strengths.push("Strong OSINT");
  if (input.phonesCount) strengths.push("Reachable");

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

async function runAI(input: AIInput): Promise<AIResult | null> {
  const client = getOpenAI();
  if (!client) return null;

  const prompt = `You are an expert debt collection decision engine. Return ONLY valid JSON with keys behaviorPrediction,paymentProbability,strategy,tone,nextAction,summary,confidence,redFlags,strengths,riskBoost,urgency.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: JSON.stringify(input) },
        ],
      });

      const text = response.choices[0]?.message?.content || "";
      const parsed = safeJsonParse<Record<string, unknown> | null>(text, null);
      if (!parsed) continue;

      const normalized = {
        ...parsed,
        paymentProbability: safeNumber((parsed as any).paymentProbability),
        confidence: safeNumber((parsed as any).confidence),
        riskBoost: safeNumber((parsed as any).riskBoost),
        urgency: safeNumber((parsed as any).urgency),
      };

      const validated = AIResultSchema.safeParse(normalized);
      if (validated.success) return validated.data;
    } catch {
      if (attempt === 2) return null;
    }
  }

  return null;
}

export async function generateCallScript(input: AIInput, aiResult: AIResult): Promise<CallScript> {
  const fallback: CallScript = {
    opening: `أهلاً أستاذ ${input.clientName}، مع حضرتك من قسم التحصيل.`,
    mainBody: `بخصوص المديونية المتأخرة بقيمة ${input.totalAmountDue}، محتاجين نعرف ميعاد السداد.`,
    objectionHandling: ["فاهم حضرتك، بس لازم نلاقي حل دلوقتي.", "ممكن نجدول المبلغ لو سددت جزء حالاً."],
    closing: "شكراً لحضرتك، منتظرين السداد في الميعاد.",
    whatsappMessage: `الأستاذ/ة ${input.clientName}، نرجو التواصل فورًا بخصوص المديونية ${input.totalAmountDue} لتسوية الموقف في أسرع وقت.`,
  };

  const client = getOpenAI();
  if (!client) return fallback;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Generate Arabic Egyptian debt-collection script JSON with keys opening,mainBody,objectionHandling,closing,whatsappMessage. Respect compliance.",
        },
        { role: "user", content: JSON.stringify({ input, aiResult }) },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = safeJsonParse<Record<string, unknown> | null>(text, null);
    const validated = CallScriptSchema.safeParse(parsed);

    return validated.success ? validated.data : fallback;
  } catch {
    return fallback;
  }
}

export async function analyzeClient(input: AIInput): Promise<AIResult> {
  const ai = await runAI(input);
  if (ai) return ai;
  return fallbackAI(input);
}

export function getCallPriority(ai: AIResult, riskScore: number) {
  return Math.round(ai.paymentProbability * 0.3 + riskScore * 0.5 + ai.urgency * 0.2);
}
