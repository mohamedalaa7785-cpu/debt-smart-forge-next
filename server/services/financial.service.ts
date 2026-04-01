import { parseNumber, calculateLoanAmountDue } from "@/lib/utils";

/* =========================
   TYPES
========================= */
export type LoanType =
  | "PIL"
  | "VSBL"
  | "AUTO"
  | "CC"
  | "WRITEOFF"
  | string;

export interface FinancialInput {
  loanType: LoanType;
  emi: number | string;
  bucket: number | string;

  penaltyEnabled?: boolean;
  penaltyAmount?: number | string;

  customFormulaEnabled?: boolean;
  customMultiplier?: number | string;
}

export interface FinancialResult {
  loanType: LoanType;

  emi: number;
  bucket: number;

  penaltyEnabled: boolean;
  penaltyAmount: number;

  baseAmount: number;
  amountDue: number;

  riskWeight: number;        // 🔥 مهم للـ priority
  classification: string;    // 🔥 LOW / MEDIUM / HIGH / CRITICAL
}

/* =========================
   CONFIG (TUNABLE ENGINE)
========================= */
const CONFIG = {
  penaltyRates: {
    PIL: 0.1,
    VSBL: 0.1,
    AUTO: 0,
    CC: 0,
    WRITEOFF: 0,
  },

  classificationThresholds: {
    CRITICAL: 50000,
    HIGH: 20000,
    MEDIUM: 5000,
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
   GET PENALTY RATE
========================= */
function getPenaltyRate(type: LoanType) {
  const key = type.toUpperCase() as keyof typeof CONFIG.penaltyRates;
  return CONFIG.penaltyRates[key] ?? 0;
}

/* =========================
   CALCULATE PENALTY
========================= */
function calculatePenalty(
  loanType: LoanType,
  emi: number,
  bucket: number,
  penaltyEnabled: boolean,
  penaltyAmount?: number
) {
  if (!penaltyEnabled) return 0;

  if (penaltyAmount && penaltyAmount > 0) {
    return penaltyAmount;
  }

  const rate = getPenaltyRate(loanType);

  return emi * rate * bucket;
}

/* =========================
   CLASSIFICATION
========================= */
function classify(amountDue: number) {
  if (amountDue >= CONFIG.classificationThresholds.CRITICAL)
    return "CRITICAL";

  if (amountDue >= CONFIG.classificationThresholds.HIGH)
    return "HIGH";

  if (amountDue >= CONFIG.classificationThresholds.MEDIUM)
    return "MEDIUM";

  return "LOW";
}

/* =========================
   MAIN ENGINE 🔥
========================= */
export function calculateFinancials(
  input: FinancialInput
): FinancialResult {
  const emi = safeNumber(input.emi);
  const bucket = Math.max(1, safeNumber(input.bucket, 1));

  const loanType = input.loanType;

  const penaltyEnabled = input.penaltyEnabled ?? false;
  const explicitPenalty = safeNumber(input.penaltyAmount);

  /* =========================
     PENALTY
  ========================= */
  const penaltyAmount = calculatePenalty(
    loanType,
    emi,
    bucket,
    penaltyEnabled,
    explicitPenalty
  );

  /* =========================
     BASE
  ========================= */
  const baseAmount = emi * bucket;

  /* =========================
     CORE FORMULA
  ========================= */
  let amountDue = calculateLoanAmountDue({
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
  });

  /* =========================
     CUSTOM FORMULA
  ========================= */
  if (input.customFormulaEnabled) {
    const multiplier = Math.max(
      1,
      safeNumber(input.customMultiplier, 1)
    );

    amountDue *= multiplier;
  }

  /* =========================
     CLASSIFICATION
  ========================= */
  const classification = classify(amountDue);

  /* =========================
     RISK WEIGHT 🔥
  ========================= */
  const riskWeight =
    amountDue / 1000 + bucket * 10;

  return {
    loanType,
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
    baseAmount,
    amountDue,
    riskWeight,
    classification,
  };
}

/* =========================
   CLIENT SUMMARY (OPTIMIZED)
========================= */
export function calculateClientFinancialSummary(
  loans: FinancialResult[]
) {
  let totalEMI = 0;
  let totalAmountDue = 0;
  let totalPenalty = 0;
  let totalBase = 0;

  for (const loan of loans) {
    totalEMI += loan.emi;
    totalAmountDue += loan.amountDue;
    totalPenalty += loan.penaltyAmount;
    totalBase += loan.baseAmount;
  }

  return {
    totalEMI,
    totalAmountDue,
    totalPenalty,
    totalBase,
  };
}

/* =========================
   PRIORITY BOOST (ADVANCED)
========================= */
export function calculateFinancialPriority(
  loans: FinancialResult[]
) {
  return loans.reduce((score, loan) => {
    return score + loan.riskWeight;
  }, 0);
}

/* =========================
   SETTLEMENT SIMULATOR 💰
========================= */
export interface SettlementInput {
  originalBalance: number;
  haircutPercentage: number; // e.g., 30 for 30%
}

export interface SettlementResult {
  originalBalance: number;
  haircutPercentage: number;
  haircutAmount: number;
  settlementAmount: number;
  savings: number;
}

export function simulateSettlement(input: SettlementInput): SettlementResult {
  const originalBalance = safeNumber(input.originalBalance);
  const haircutPercentage = safeNumber(input.haircutPercentage);
  
  const haircutAmount = (originalBalance * haircutPercentage) / 100;
  const settlementAmount = originalBalance - haircutAmount;
  const savings = haircutAmount;

  return {
    originalBalance,
    haircutPercentage,
    haircutAmount,
    settlementAmount,
    savings,
  };
}
