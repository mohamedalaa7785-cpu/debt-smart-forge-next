import OpenAI from "openai";
import { safeJsonParse } from "@/lib/utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export type AiDecisionTone = "soft" | "balanced" | "firm" | "aggressive";

export type AiAnalysisInput = {
  clientName: string;
  totalAmountDue?: number;
  totalBalance?: number;
  totalEMI?: number;
  riskScore?: number;
  riskLabel?: "HIGH" | "MEDIUM" | "LOW" | string;
  lastActionDays?: number;
  phonesCount?: number;
  addressesCount?: number;
  loansCount?: number;
  osintConfidence?: number;
  osintSummary?: string | null;
  actions?: Array<{
    actionType?: string;
    note?: string | null;
    createdAt?: string | Date;
  }>;
  loanTypes?: string[];
};

export type AiAnalysisResult = {
  behaviorPrediction: string;
  paymentProbability: number;
  recommendedStrategy: string;
  communicationTone: AiDecisionTone;
  nextBestAction: string;
  summary: string;
  confidence: number;
  redFlags: string[];
  strengths: string[];
};

function clampScore(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function deriveTone(params: {
  riskScore: number;
  paymentProbability: number;
  lastActionDays: number;
}): AiDecisionTone {
  const { riskScore, paymentProbability, lastActionDays } = params;

  if (riskScore >= 80 || (lastActionDays > 7 && paymentProbability < 35)) {
    return "aggressive";
  }

  if (riskScore >= 60 || paymentProbability < 55) {
    return "firm";
  }

  if (paymentProbability >= 75 && riskScore < 45) {
    return "soft";
  }

  return "balanced";
}

function buildFallbackAnalysis(input: AiAnalysisInput): AiAnalysisResult {
  const riskScore = clampScore(input.riskScore ?? 0);
  const osintConfidence = clampScore(input.osintConfidence ?? 0);
  const lastActionDays = Math.max(0, input.lastActionDays ?? 0);

  let paymentProbability = 50;
  paymentProbability += osintConfidence * 0.15;
  paymentProbability -= riskScore * 0.35;
  paymentProbability -= Math.min(20, lastActionDays * 2);
  paymentProbability += Math.min(10, (input.phonesCount ?? 0) * 2);
  paymentProbability += Math.min(8, (input.addressesCount ?? 0) * 2);
  paymentProbability += Math.min(8, (input.loansCount ?? 0) * 1);

  paymentProbability = clampScore(Math.round(paymentProbability));

  const tone = deriveTone({
    riskScore,
    paymentProbability,
    lastActionDays,
  });

  const behaviorPrediction =
    paymentProbability >= 75
      ? "Likely to pay with minimal pressure."
      : paymentProbability >= 50
        ? "May pay after follow-up and structured reminder."
        : "Likely to delay or avoid without stronger follow-up.";

  const recommendedStrategy =
    paymentProbability >= 75
      ? "Use a soft reminder and close quickly."
      : paymentProbability >= 50
        ? "Use a balanced follow-up with a clear deadline."
        : "Use a firm follow-up, confirm details, and escalate monitoring.";

  const nextBestAction =
    paymentProbability >= 75
      ? "Call and confirm payment date."
      : paymentProbability >= 50
        ? "Call, then follow up with WhatsApp reminder."
      : "Call with firm script and log the response immediately.";

  const redFlags: string[] = [];
  if ((input.phonesCount ?? 0) === 0) redFlags.push("No phone numbers available");
  if ((input.addressesCount ?? 0) === 0) redFlags.push("No address available");
  if ((input.osintConfidence ?? 0) < 25) redFlags.push("Weak OSINT confidence");
  if (lastActionDays > 7) redFlags.push("Inactive for more than 7 days");

  const strengths: string[] = [];
  if ((input.phonesCount ?? 0) > 0) strengths.push("Reachable by phone");
  if ((input.addressesCount ?? 0) > 0) strengths.push("Address data available");
  if ((input.osintConfidence ?? 0) >= 50) strengths.push("Useful intelligence signals");
  if ((input.totalAmountDue ?? 0) > 0) strengths.push("Active financial exposure");

  return {
    behaviorPrediction,
    paymentProbability,
    recommendedStrategy,
    communicationTone: tone,
    nextBestAction,
    summary: [
      `Client: ${input.clientName}`,
      behaviorPrediction,
      recommendedStrategy,
      `Tone: ${tone}`,
    ].join(" "),
    confidence: clampScore(Math.round((osintConfidence + (100 - riskScore)) / 2)),
    redFlags,
    strengths,
  };
}

async function callOpenAI(input: AiAnalysisInput): Promise<AiAnalysisResult | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a debt collection intelligence analyst. Return ONLY valid JSON with keys: behaviorPrediction, paymentProbability, recommendedStrategy, communicationTone, nextBestAction, summary, confidence, redFlags, strengths. Do not invent facts. Use only the provided data.",
        },
        {
          role: "user",
          content: JSON.stringify({
            ...input,
            actions: input.actions?.slice(0, 20) ?? [],
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) return null;

    const parsed = safeJsonParse<Partial<AiAnalysisResult>>(raw, {});
    if (
      !parsed.behaviorPrediction ||
      typeof parsed.paymentProbability !== "number" ||
      !parsed.recommendedStrategy ||
      !parsed.communicationTone ||
      !parsed.nextBestAction ||
      !parsed.summary
    ) {
      return null;
    }

    return {
      behaviorPrediction: parsed.behaviorPrediction,
      paymentProbability: clampScore(Math.round(parsed.paymentProbability)),
      recommendedStrategy: parsed.recommendedStrategy,
      communicationTone:
        parsed.communicationTone === "soft" ||
        parsed.communicationTone === "balanced" ||
        parsed.communicationTone === "firm" ||
        parsed.communicationTone === "aggressive"
          ? parsed.communicationTone
          : "balanced",
      nextBestAction: parsed.nextBestAction,
      summary: parsed.summary,
      confidence: clampScore(Math.round(parsed.confidence ?? 0)),
      redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags.map(String) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    };
  } catch {
    return null;
  }
}

export async function analyzeClientWithAI(
  input: AiAnalysisInput
): Promise<AiAnalysisResult> {
  const aiResult = await callOpenAI(input);
  if (aiResult) return aiResult;

  return buildFallbackAnalysis(input);
}

export function buildAiPromptSummary(input: AiAnalysisInput) {
  const totalAmountDue = input.totalAmountDue ?? 0;
  const totalBalance = input.totalBalance ?? 0;
  const riskScore = input.riskScore ?? 0;
  const osintConfidence = input.osintConfidence ?? 0;

  return [
    `Client: ${input.clientName}`,
    `Amount Due: ${totalAmountDue}`,
    `Balance: ${totalBalance}`,
    `Risk Score: ${riskScore}`,
    `OSINT Confidence: ${osintConfidence}`,
  ].join(" | ");
}

export function getCollectionRecommendation(result: AiAnalysisResult) {
  if (result.communicationTone === "aggressive") {
    return "Escalate carefully with a firm script and fast logging.";
  }

  if (result.communicationTone === "firm") {
    return "Use a firm follow-up and set a clear deadline.";
  }

  if (result.communicationTone === "soft") {
    return "Use a light reminder and close the payment fast.";
  }

  return "Use a balanced follow-up and keep monitoring.";
  }
