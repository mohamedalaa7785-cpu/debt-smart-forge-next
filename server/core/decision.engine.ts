import { RiskResult } from "@/server/services/risk.service";
import { AIResult } from "@/server/services/ai.service";

export type FinalAction = "CALL" | "FOLLOW" | "VISIT" | "WAIT" | "LEGAL";

export interface DecisionInput {
  risk: RiskResult;
  ai: AIResult;
  osintConfidence: number;
  lastActionDays: number;
  totalDue: number;
  location?: { lat: number; lng: number };
}

export interface DecisionResult {
  action: FinalAction;
  nextBestAction: FinalAction;
  priority: number;
  reason: string;
  recommendedChannel: "call" | "whatsapp" | "sms" | "email";
  followUpTimingHours: number;
  probabilityToPay: number;
  suggestedTime: string;
}

export function decideAction(input: DecisionInput): DecisionResult {
  const { risk, ai, lastActionDays, totalDue } = input;

  let nextBestAction: FinalAction = "CALL";
  let priority = risk.score + ai.urgency * 0.5;
  let reason = "Standard collection call required based on risk and AI analysis.";

  if (risk.score > 100 && lastActionDays > 10 && totalDue > 5000) {
    nextBestAction = "VISIT";
    reason = "High risk, long inactivity, and significant due suggest a field visit.";
  } else if (risk.score > 130 && lastActionDays > 30) {
    nextBestAction = "LEGAL";
    reason = "Critical risk and extreme inactivity; escalate to legal.";
  } else if (ai.paymentProbability > 70 && lastActionDays < 3) {
    nextBestAction = "FOLLOW";
    reason = "High payment probability; soft follow-up is recommended.";
  } else if (lastActionDays === 0) {
    nextBestAction = "WAIT";
    reason = "Action already taken today; monitor for response.";
  }

  const recommendedChannel: DecisionResult["recommendedChannel"] =
    ai.tone === "soft" ? "whatsapp" : risk.label === "CRITICAL" ? "call" : "sms";

  const followUpTimingHours = ai.paymentProbability >= 70 ? 24 : 12;
  const suggestedTime = followUpTimingHours <= 12 ? "Today" : "Within 24h";

  return {
    action: nextBestAction,
    nextBestAction,
    priority: Math.round(priority),
    reason,
    recommendedChannel,
    followUpTimingHours,
    probabilityToPay: ai.paymentProbability,
    suggestedTime,
  };
}
