import { parseNumber } from "@/lib/utils";

/* =========================
   TYPES
========================= */
export interface RiskInput {
  bucket?: number | string;
  amountDue?: number | string;

  hasPhone?: boolean;
  hasAddress?: boolean;
  hasLoans?: boolean;
  hasOsint?: boolean;

  lastActionDays?: number | string;

  aiSignalsScore?: number | string;
}

export interface RiskResult {
  score: number;
  label: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

  breakdown: {
    bucket: number;
    amount: number;
    data: number;
    inactivity: number;
    ai: number;
  };

  meta: {
    urgencyLevel: number;
    isActionRequired: boolean;
  };
}

/* =========================
   CONFIG (TUNABLE ENGINE)
========================= */
const CONFIG = {
  weights: {
    bucket: 10,
    amount: 0.001,
    missingData: 6,
    inactivity: 2,
    ai: 5,
  },

  caps: {
    amount: 50,
    inactivity: 30,
    ai: 25,
  },

  thresholds: {
    CRITICAL: 120,
    HIGH: 80,
    MEDIUM: 40,
  },
};

/* =========================
   SAFE NUMBER
========================= */
function safeNumber(val: any, fallback = 0) {
  const n = parseNumber(val);
  return isNaN(n) ? fallback : n;
}

/* =========================
   MAIN RISK ENGINE 🔥
========================= */
export function calculateRisk(
  input: RiskInput
): RiskResult {
  const bucket = Math.max(1, safeNumber(input.bucket, 1));
  const amountDue = Math.max(0, safeNumber(input.amountDue));
  const lastActionDays = Math.max(
    0,
    safeNumber(input.lastActionDays)
  );
  const aiScore = Math.max(
    0,
    safeNumber(input.aiSignalsScore)
  );

  /* =========================
     BUCKET
  ========================= */
  const bucketScore = bucket * CONFIG.weights.bucket;

  /* =========================
     AMOUNT
  ========================= */
  const rawAmountScore =
    amountDue * CONFIG.weights.amount;

  const amountScore = Math.min(
    CONFIG.caps.amount,
    rawAmountScore
  );

  /* =========================
     DATA COMPLETENESS
  ========================= */
  let dataScore = 0;

  if (!input.hasPhone) dataScore += CONFIG.weights.missingData;
  if (!input.hasAddress) dataScore += CONFIG.weights.missingData;
  if (!input.hasLoans) dataScore += CONFIG.weights.missingData;
  if (!input.hasOsint) dataScore += CONFIG.weights.missingData;

  /* =========================
     INACTIVITY
  ========================= */
  const inactivityScore = Math.min(
    CONFIG.caps.inactivity,
    lastActionDays * CONFIG.weights.inactivity
  );

  /* =========================
     AI SIGNALS
  ========================= */
  const aiSignalScore = Math.min(
    CONFIG.caps.ai,
    aiScore * CONFIG.weights.ai
  );

  /* =========================
     FINAL SCORE
  ========================= */
  const score = Math.round(
    bucketScore +
      amountScore +
      dataScore +
      inactivityScore +
      aiSignalScore
  );

  /* =========================
     LABEL
  ========================= */
  let label: RiskResult["label"] = "LOW";

  if (score >= CONFIG.thresholds.CRITICAL) label = "CRITICAL";
  else if (score >= CONFIG.thresholds.HIGH) label = "HIGH";
  else if (score >= CONFIG.thresholds.MEDIUM) label = "MEDIUM";

  /* =========================
     META INTELLIGENCE 🔥
  ========================= */
  const urgencyLevel = Math.min(100, score);

  const isActionRequired =
    score >= CONFIG.thresholds.MEDIUM ||
    lastActionDays > 3;

  return {
    score,
    label,

    breakdown: {
      bucket: bucketScore,
      amount: amountScore,
      data: dataScore,
      inactivity: inactivityScore,
      ai: aiSignalScore,
    },

    meta: {
      urgencyLevel,
      isActionRequired,
    },
  };
}

/* =========================
   PRIORITY ENGINE 🔥🔥🔥
========================= */
export function calculatePriority(input: {
  amountDue?: number | string;
  riskScore?: number | string;
  lastActionDays?: number | string;
  aiBoost?: number | string;
}) {
  const amount = safeNumber(input.amountDue);
  const risk = safeNumber(input.riskScore);
  const inactivity = safeNumber(input.lastActionDays);
  const aiBoost = safeNumber(input.aiBoost);

  /* =========================
     NORMALIZED SCORES
  ========================= */
  const amountScore = amount / 1000;
  const riskScore = risk * 2;
  const inactivityPenalty = inactivity * 1.5;

  /* =========================
     FINAL PRIORITY
  ========================= */
  const priority =
    amountScore +
    riskScore -
    inactivityPenalty +
    aiBoost * 5;

  return Math.round(priority);
}

/* =========================
   SMART TAG (UI + AI)
========================= */
export function getRiskTag(score: number) {
  if (score >= 120) return "CRITICAL";
  if (score >= 90) return "VERY HIGH";
  if (score >= 70) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/* =========================
   ACTION DECISION 🔥
========================= */
export function getActionDecision({
  riskScore,
  lastActionDays,
}: {
  riskScore: number;
  lastActionDays: number;
}) {
  if (riskScore > 120) return "CALL_NOW";
  if (riskScore > 80) return "CALL_TODAY";
  if (lastActionDays > 3) return "FOLLOW_UP";
  return "MONITOR";
     }
