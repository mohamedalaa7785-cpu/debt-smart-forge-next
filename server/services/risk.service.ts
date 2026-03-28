import { parseNumber, getRiskLabel } from "@/lib/utils";

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
  label: "HIGH" | "MEDIUM" | "LOW";

  breakdown: {
    bucket: number;
    amount: number;
    data: number;
    inactivity: number;
    ai: number;
  };
}

/* =========================
   MAIN RISK CALCULATION
========================= */
export function calculateRisk(input: RiskInput): RiskResult {
  const bucket = Math.max(1, parseNumber(input.bucket ?? 1));
  const amountDue = Math.max(0, parseNumber(input.amountDue ?? 0));

  const lastActionDays = Math.max(
    0,
    parseNumber(input.lastActionDays ?? 0)
  );

  const aiScore = Math.max(0, parseNumber(input.aiSignalsScore ?? 0));

  /* =========================
     BUCKET SCORE
  ========================= */
  const bucketScore = bucket * 8;

  /* =========================
     AMOUNT SCORE
  ========================= */
  const amountScore = Math.min(40, amountDue / 1000);

  /* =========================
     DATA COMPLETENESS
  ========================= */
  let dataScore = 0;

  if (!input.hasPhone) dataScore += 6;
  if (!input.hasAddress) dataScore += 6;
  if (!input.hasLoans) dataScore += 4;
  if (!input.hasOsint) dataScore += 6;

  /* =========================
     INACTIVITY SCORE
  ========================= */
  let inactivityScore = 0;

  if (lastActionDays <= 1) inactivityScore = 0;
  else if (lastActionDays <= 3) inactivityScore = 5;
  else if (lastActionDays <= 7) inactivityScore = 10;
  else if (lastActionDays <= 14) inactivityScore = 15;
  else inactivityScore = 20;

  /* =========================
     AI SIGNALS
  ========================= */
  const aiSignalScore = Math.min(20, aiScore);

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

  return {
    score,
    label: getRiskLabel(score),

    breakdown: {
      bucket: bucketScore,
      amount: amountScore,
      data: dataScore,
      inactivity: inactivityScore,
      ai: aiSignalScore,
    },
  };
}

/* =========================
   PRIORITY ENGINE 🔥
========================= */
export function calculatePriority(input: {
  amountDue?: number | string;
  riskScore?: number | string;
  lastActionDays?: number | string;
}) {
  const amount = parseNumber(input.amountDue ?? 0);
  const risk = parseNumber(input.riskScore ?? 0);
  const inactivity = parseNumber(input.lastActionDays ?? 0);

  /* =========================
     PRIORITY FORMULA
  ========================= */
  return (
    amount * 0.5 + // الفلوس أهم حاجة
    risk * 10 - // الخطر
    inactivity * 2 // التأخير يقلل الأولوية
  );
}

/* =========================
   RISK TAG (ADVANCED UI)
========================= */
export function getRiskTag(score: number) {
  if (score >= 90) return "CRITICAL";
  if (score >= 70) return "VERY HIGH";
  if (score >= 50) return "HIGH";
  if (score >= 30) return "MEDIUM";
  return "LOW";
}
