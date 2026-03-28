export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export function formatCurrency(value: number | string | null | undefined) {
  const n =
    typeof value === "string"
      ? Number(value)
      : typeof value === "number"
        ? value
        : 0;

  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

export function calculateLoanAmountDue(params: {
  emi: number | string;
  bucket: number | string;
  penaltyEnabled?: boolean;
  penaltyAmount?: number | string;
}) {
  const emi = parseNumber(params.emi);
  const bucket = Math.max(1, parseNumber(params.bucket));
  const penaltyEnabled = params.penaltyEnabled ?? false;
  const penaltyAmount = penaltyEnabled ? parseNumber(params.penaltyAmount) : 0;

  return (emi + penaltyAmount) * bucket;
}

export function getRiskLabel(score: number) {
  if (score >= 80) return "HIGH";
  if (score >= 45) return "MEDIUM";
  return "LOW";
}

export function getRiskTone(score: number) {
  if (score >= 80) return "destructive";
  if (score >= 45) return "warning";
  return "success";
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
