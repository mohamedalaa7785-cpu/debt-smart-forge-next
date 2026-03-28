import { getRiskLabel, parseNumber } from "@/lib/utils";

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
  factors: {
    bucket: number;
    amountDue: number;
    missingData: number;
    inactivity: number;
    aiSignals: number;
  };
}

export function calculateRisk(input: RiskInput): RiskResult {
  const bucket = Math.max(1, parseNumber(input.bucket ?? 1));
  const amountDue = Math.max(0, parseNumber(input.amountDue ?? 0));

  const hasPhone = input.hasPhone ?? false;
  const hasAddress = input.hasAddress ?? false;
  const hasLoans = input.hasLoans ?? false;
  const hasOsint = input.hasOsint ?? false;

  const lastActionDays = Math.max(0, parseNumber(input.lastActionDays ?? 0));
  const aiSignalsScore = Math.max(0, parseNumber(input.aiSignalsScore ?? 0));

  const bucketScore = bucket * 8;
  const amountScore = Math.min(35, amountDue / 1000);
  const missingDataScore =
    (hasPhone ? 0 : 5) +
    (hasAddress ? 0 : 5) +
    (hasLoans ? 0 : 3) +
    (hasOsint ? 0 : 6);

  const inactivityScore =
    lastActionDays <= 1
      ? 0
      : lastActionDays <= 3
        ? 4
        : lastActionDays <= 7
          ? 8
          : lastActionDays <= 14
            ? 12
            : 18;

  const aiScore = Math.min(20, aiSignalsScore);

  const score = Math.round(
    bucketScore + amountScore + missingDataScore + inactivityScore + aiScore
  );

  return {
    score,
    label: getRiskLabel(score),
    factors: {
      bucket: bucketScore,
      amountDue: amountScore,
      missingData: missingDataScore,
      inactivity: inactivityScore,
      aiSignals: aiScore,
    },
  };
}

export function getPriorityRank(input: {
  amountDue?: number | string;
  riskScore?: number | string;
  lastActionDays?: number | string;
}) {
  const amountDue = Math.max(0, parseNumber(input.amountDue ?? 0));
  const riskScore = Math.max(0, parseNumber(input.riskScore ?? 0));
  const lastActionDays = Math.max(0, parseNumber(input.lastActionDays ?? 0));

  return amountDue * 0.5 + riskScore * 10 - lastActionDays * 2;
}
