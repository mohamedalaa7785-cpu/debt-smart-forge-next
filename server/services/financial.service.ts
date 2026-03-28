import { calculateLoanAmountDue, parseNumber } from "@/lib/utils";

export type LoanType = "PIL" | "VSBL" | "AUTO" | "CC" | "WRITEOFF" | string;

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
  emi: number;
  bucket: number;
  penaltyEnabled: boolean;
  penaltyAmount: number;
  amountDue: number;
  baseAmountDue: number;
  loanType: LoanType;
}

function getDefaultPenaltyRate(loanType: LoanType) {
  const type = loanType.toUpperCase();

  if (type === "PIL" || type === "VSBL") return 0.1;
  return 0;
}

export function calculateFinancials(input: FinancialInput): FinancialResult {
  const emi = parseNumber(input.emi);
  const bucket = Math.max(1, parseNumber(input.bucket));
  const loanType = input.loanType;

  const penaltyEnabled = input.penaltyEnabled ?? false;

  const defaultPenaltyRate = getDefaultPenaltyRate(loanType);
  const explicitPenaltyAmount = parseNumber(input.penaltyAmount);

  let penaltyAmount = 0;

  if (penaltyEnabled) {
    if (explicitPenaltyAmount > 0) {
      penaltyAmount = explicitPenaltyAmount;
    } else if (defaultPenaltyRate > 0) {
      penaltyAmount = emi * defaultPenaltyRate;
    }
  }

  const baseAmountDue = emi * bucket;
  let amountDue = calculateLoanAmountDue({
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
  });

  if (input.customFormulaEnabled) {
    const multiplier = Math.max(1, parseNumber(input.customMultiplier) || 1);
    amountDue = amountDue * multiplier;
  }

  return {
    emi,
    bucket,
    penaltyEnabled,
    penaltyAmount,
    amountDue,
    baseAmountDue,
    loanType,
  };
}

export function calculateClientFinancialSummary(loans: FinancialResult[]) {
  return loans.reduce(
    (acc, loan) => {
      acc.totalEMI += loan.emi;
      acc.totalAmountDue += loan.amountDue;
      acc.totalPenalty += loan.penaltyAmount;
      acc.totalBalance += loan.baseAmountDue;
      return acc;
    },
    {
      totalEMI: 0,
      totalAmountDue: 0,
      totalPenalty: 0,
      totalBalance: 0,
    }
  );
    }
