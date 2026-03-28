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
}

/* =========================
   DEFAULT PENALTY LOGIC
========================= */
function getDefaultPenaltyRate(type: LoanType) {
  const t = type.toUpperCase();

  // القروض اللي عليها غرامة
  if (t === "PIL" || t === "VSBL") return 0.1;

  // بدون غرامة
  return 0;
}

/* =========================
   MAIN CALCULATION
========================= */
export function calculateFinancials(
  input: FinancialInput
): FinancialResult {
  const emi = parseNumber(input.emi);
  const bucket = Math.max(1, parseNumber(input.bucket));

  const loanType = input.loanType;

  const penaltyEnabled = input.penaltyEnabled ?? false;
  const explicitPenalty = parseNumber(input.penaltyAmount);

  const defaultRate = getDefaultPenaltyRate(loanType);

  let penaltyAmount = 0;

  /* =========================
     PENALTY LOGIC
  ========================= */
  if (penaltyEnabled) {
    if (explicitPenalty > 0) {
      penaltyAmount = explicitPenalty;
    } else if (defaultRate > 0) {
      penaltyAmount = emi * defaultRate;
    }
  }

  /* =========================
     BASE AMOUNT
  ========================= */
  const baseAmount = emi * bucket;

  /* =========================
     FINAL AMOUNT
  ========================= */
  let amountDue = calculateLoanAmountDue({
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
  });

  /* =========================
     CUSTOM FORMULA (ADVANCED)
  ========================= */
  if (input.customFormulaEnabled) {
    const multiplier = Math.max(
      1,
      parseNumber(input.customMultiplier || 1)
    );

    amountDue = amountDue * multiplier;
  }

  return {
    loanType,
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
    baseAmount,
    amountDue,
  };
}

/* =========================
   CLIENT TOTAL SUMMARY
========================= */
export function calculateClientFinancialSummary(
  loans: FinancialResult[]
) {
  return loans.reduce(
    (acc, loan) => {
      acc.totalEMI += loan.emi;
      acc.totalAmountDue += loan.amountDue;
      acc.totalPenalty += loan.penaltyAmount;
      acc.totalBase += loan.baseAmount;

      return acc;
    },
    {
      totalEMI: 0,
      totalAmountDue: 0,
      totalPenalty: 0,
      totalBase: 0,
    }
  );
}

/* =========================
   SMART CLASSIFICATION
========================= */
export function classifyLoan(loan: FinancialResult) {
  const due = loan.amountDue;

  if (due > 50000) return "CRITICAL";
  if (due > 20000) return "HIGH";
  if (due > 5000) return "MEDIUM";

  return "LOW";
}

/* =========================
   PRIORITY BOOST (FINANCIAL)
========================= */
export function calculateFinancialPriority(
  amountDue: number,
  bucket: number
) {
  const dueScore = amountDue / 1000;
  const bucketScore = bucket * 5;

  return dueScore + bucketScore;
  }
