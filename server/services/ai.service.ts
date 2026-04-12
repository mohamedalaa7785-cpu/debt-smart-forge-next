import OpenAI from "openai";
import { safeJsonParse, parseNumber } from "@/lib/utils";
import { getRequiredEnv } from "@/lib/env";

/* =========================
   OPENAI INIT (SAFE)
========================= */
let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY"),
    });
  }
  return openai;
}

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
  aiSignalsScore?: number;
  behaviorType?: string; // cooperative, delaying, avoiding
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
  const signals = safeNumber(input.aiSignalsScore);

  let probability = 50;

  probability += osint * 0.3;
  probability -= risk * 0.5;
  probability -= inactivity * 2;
  probability += signals * 0.5;

  probability += (input.phonesCount ?? 0) * 4;
  probability += (input.addressesCount ?? 0) * 2;

  probability = Math.max(0, Math.min(100, Math.round(probability)));

  let tone: Tone = "balanced";

  if (risk > 90) tone = "aggressive";
  else if (risk > 70) tone = "firm";
  else if (probability > 70) tone = "soft";

  let behaviorPrediction = "";
  let strategy = "";
  let nextAction = "";

  if (probability > 75) {
    behaviorPrediction = "Client likely to pay immediately";
    strategy = "Close quickly with minimal resistance";
    nextAction = "Confirm payment and follow-up";
  } else if (probability > 45) {
    behaviorPrediction = "Client may pay with structured follow-up";
    strategy = "Consistent reminders + negotiation";
    nextAction = "Call + WhatsApp";
  } else {
    behaviorPrediction = "Client likely to delay or avoid";
    strategy = "Pressure + escalation";
    nextAction = "Firm call + log outcome";
  }

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

/* =========================
   OPENAI CALL 🔥
========================= */
async function runAI(input: AIInput): Promise<AIResult | null> {
  const client = getOpenAI();
  if (!client) return null;

  try {
    const prompt = `
You are an expert debt collection decision engine.

Analyze the client and return ONLY valid JSON:

{
  "behaviorPrediction": "...",
  "paymentProbability": number (0-100),
  "strategy": "...",
  "tone": "soft | balanced | firm | aggressive",
  "nextAction": "...",
  "summary": "...",
  "confidence": number (0-100),
  "redFlags": string[],
  "strengths": string[],
  "riskBoost": number,
  "urgency": number (0-100)
}

Focus on:
- payment likelihood
- pressure strategy
- urgency level
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify(input) },
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
   SCRIPT GENERATION 🔥
========================= */
export async function generateCallScript(input: AIInput, aiResult: AIResult): Promise<CallScript> {
  const client = getOpenAI();
  const agentName = process.env.COLLECTION_AGENT_NAME || "Muhammad";
  const orgName = process.env.COLLECTION_ORG_NAME || "First Abu Dhabi Bank (Awda Sabqa)";
  if (!client) {
    return {
      opening: `Hello ${input.clientName}, this is Debt Smart OS calling regarding your outstanding balance.`,
      mainBody: `We noticed an overdue amount of ${input.totalAmountDue}. We need to discuss a payment plan.`,
      objectionHandling: ["I understand, but we need to settle this.", "We can offer a temporary extension if you pay a portion now."],
      closing: "Thank you, we expect the payment by the agreed date.",
      whatsappMessage: `الأستاذ/ة ${input.clientName}، مع حضرتك ${agentName} من ${orgName}. نرجو التواصل معنا بشكل عاجل بخصوص المستحقات القائمة لتسوية الموقف وتجنب التصعيد النظامي.`
    };
  }

  try {
    const prompt = `
You are a professional debt collection agent. Generate a call script in ARABIC (Egyptian dialect) and a WhatsApp message.
The tone should be ${aiResult.tone}.
Client: ${input.clientName}
Amount Due: ${input.totalAmountDue}
Risk Level: ${input.riskLabel}
Strategy: ${aiResult.strategy}
Agent Name: ${agentName}
Organization: ${orgName}

Constraints:
- WhatsApp message must start with formal identification (agent + organization).
- Include client name clearly.
- Ask for immediate contact in a professional tone.
- You may mention lawful escalation if no response, but do not use insults, harassment, or illegal threats.

Return ONLY valid JSON:
{
  "opening": "...",
  "mainBody": "...",
  "objectionHandling": ["...", "..."],
  "closing": "...",
  "whatsappMessage": "..."
}
`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: JSON.stringify({ input, aiResult }) },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = safeJsonParse<CallScript | null>(text, null);

    return parsed || {
      opening: `أهلاً أستاذ ${input.clientName}، مع حضرتك من قسم التحصيل.`,
      mainBody: `بخصوص المديونية المتأخرة بقيمة ${input.totalAmountDue}، محتاجين نعرف ميعاد السداد.`,
      objectionHandling: ["فاهم حضرتك، بس لازم نلاقي حل دلوقتي.", "ممكن نجدول المبلغ لو سددت جزء حالاً."],
      closing: "شكراً لحضرتك، منتظرين السداد في الميعاد.",
      whatsappMessage: `الأستاذ/ة ${input.clientName}، مع حضرتك ${agentName} من ${orgName}. نرجو التواصل فورًا بخصوص المديونية ${input.totalAmountDue} لتسوية الموقف في أسرع وقت وتجنب التصعيد النظامي.`
    };
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
    return {
      opening: `أهلاً أستاذ ${input.clientName}، مع حضرتك من قسم التحصيل.`,
      mainBody: `بخصوص المديونية المتأخرة بقيمة ${input.totalAmountDue}، محتاجين نعرف ميعاد السداد.`,
      objectionHandling: ["فاهم حضرتك، بس لازم نلاقي حل دلوقتي.", "ممكن نجدول المبلغ لو سددت جزء حالاً."],
      closing: "شكراً لحضرتك، منتظرين السداد في الميعاد.",
      whatsappMessage: `الأستاذ/ة ${input.clientName}، مع حضرتك ${agentName} من ${orgName}. نرجو التواصل فورًا بخصوص المديونية ${input.totalAmountDue} لتسوية الموقف في أسرع وقت وتجنب التصعيد النظامي.`
    };
  }
}

/* =========================
   MAIN ENTRY
========================= */
export async function analyzeClient(input: AIInput): Promise<AIResult> {
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
