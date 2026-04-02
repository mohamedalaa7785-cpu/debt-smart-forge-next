import { AIResult } from "./ai.service";

export interface DecisionInput {
  amountDue: number;
  riskScore: number;
  aiPrediction: AIResult;
  lastActionDays: number;
  osintConfidence: number;
}

export interface DecisionOutput {
  shouldCallNow: boolean;
  priorityScore: number;
  recommendedAction: string;
  reasoning: string[];
}

export function runDecisionEngine(input: DecisionInput): DecisionOutput {
  const { amountDue, riskScore, aiPrediction, lastActionDays, osintConfidence } = input;
  
  const reasoning: string[] = [];
  let priorityScore = 0;

  // 1. Financial Weight (30%)
  const amountWeight = Math.min(amountDue / 10000, 1) * 30;
  priorityScore += amountWeight;
  if (amountDue > 5000) reasoning.push("High outstanding balance");

  // 2. Risk Weight (25%)
  const riskWeight = (riskScore / 100) * 25;
  priorityScore += riskWeight;
  if (riskScore > 70) reasoning.push("High risk profile detected");

  // 3. AI Prediction Weight (20%)
  const aiWeight = (aiPrediction.paymentProbability / 100) * 20;
  priorityScore += aiWeight;
  if (aiPrediction.paymentProbability > 70) reasoning.push("AI predicts high payment probability");

  // 4. Recency Weight (15%)
  const recencyWeight = Math.min(lastActionDays / 30, 1) * 15;
  priorityScore += recencyWeight;
  if (lastActionDays > 7) reasoning.push(`No action taken for ${lastActionDays} days`);

  // 5. OSINT Weight (10%)
  const osintWeight = (osintConfidence / 100) * 10;
  priorityScore += osintWeight;
  if (osintConfidence > 80) reasoning.push("Strong social/web presence verified");

  // Decision Logic
  const shouldCallNow = priorityScore > 60 || (amountDue > 1000 && lastActionDays > 3);
  
  let recommendedAction = aiPrediction.nextAction;
  if (priorityScore > 80) recommendedAction = "URGENT: " + recommendedAction;

  return {
    shouldCallNow,
    priorityScore: Math.round(priorityScore),
    recommendedAction,
    reasoning
  };
}
