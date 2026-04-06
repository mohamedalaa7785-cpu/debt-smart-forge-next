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
  priority: number;
  reason: string;
  suggestedTime: string;
}

export function decideAction(input: DecisionInput): DecisionResult {
  const { risk, ai, lastActionDays, totalDue } = input;
  
  let action: FinalAction = "CALL";
  let priority = risk.score + (ai.urgency * 0.5);
  let reason = "";

  // Logic for VISIT
  if (risk.score > 100 && lastActionDays > 10 && totalDue > 5000) {
    action = "VISIT";
    reason = "High risk, long inactivity, and significant amount due suggest field visit.";
  } 
  // Logic for LEGAL
  else if (risk.score > 130 && lastActionDays > 30) {
    action = "LEGAL";
    reason = "Critical risk and extreme inactivity. Escalating to legal department.";
  }
  // Logic for FOLLOW
  else if (ai.paymentProbability > 70 && lastActionDays < 3) {
    action = "FOLLOW";
    reason = "High payment probability. Gentle follow-up to confirm payment.";
  }
  // Logic for WAIT
  else if (lastActionDays === 0) {
    action = "WAIT";
    reason = "Action already taken today. Monitoring for response.";
  }
  // Default to CALL
  else {
    action = "CALL";
    reason = "Standard collection call required based on risk and AI analysis.";
  }

  // Suggested Time (Simplified)
  let suggestedTime = "10:00 AM - 02:00 PM";
  if (ai.tone === "soft") suggestedTime = "04:00 PM - 07:00 PM";
  if (risk.label === "CRITICAL") suggestedTime = "IMMEDIATELY";

  return {
    action,
    priority: Math.round(priority),
    reason,
    suggestedTime
  };
}
