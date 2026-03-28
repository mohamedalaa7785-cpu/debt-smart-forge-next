/* =========================
   SAFE NUMBER PARSER
========================= */
export function parseNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;

  const num = Number(value);

  if (isNaN(num)) return fallback;

  return num;
}

/* =========================
   SAFE JSON PARSER
========================= */
export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T
): T {
  try {
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* =========================
   DATE HELPERS
========================= */
export function daysBetween(date: string | Date): number {
  const d = new Date(date).getTime();
  const now = Date.now();

  const diff = now - d;

  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/* =========================
   BUCKET CALCULATION
========================= */
export function calculateBucketFromDate(
  dueDate?: string | Date
): number {
  if (!dueDate) return 1;

  const days = daysBetween(dueDate);

  if (days <= 0) return 1;
  if (days <= 30) return 1;
  if (days <= 60) return 2;
  if (days <= 90) return 3;
  if (days <= 120) return 4;

  return 5;
}

/* =========================
   LOAN AMOUNT DUE
========================= */
export function calculateLoanAmountDue(params: {
  emi: number;
  bucket: number;
  penaltyEnabled?: boolean;
  penaltyAmount?: number;
}) {
  const emi = parseNumber(params.emi);
  const bucket = Math.max(1, parseNumber(params.bucket));

  const penaltyEnabled = params.penaltyEnabled ?? false;
  const penaltyAmount = parseNumber(params.penaltyAmount ?? 0);

  const base = emi * bucket;

  if (!penaltyEnabled) return base;

  return base + penaltyAmount * bucket;
}

/* =========================
   RISK LABEL
========================= */
export function getRiskLabel(
  score: number
): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 80) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

/* =========================
   STRING HELPERS
========================= */
export function normalizeString(value: string) {
  return value.trim().toLowerCase();
}

export function containsText(source: string, query: string) {
  return normalizeString(source).includes(normalizeString(query));
}

/* =========================
   ARRAY HELPERS
========================= */
export function uniqueArray<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/* =========================
   PHONE FORMAT
========================= */
export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/* =========================
   WHATSAPP FORMAT
========================= */
export function buildWhatsAppLink(phone: string) {
  const clean = normalizePhone(phone);

  return `https://wa.me/${clean}`;
}

/* =========================
   CURRENCY FORMAT
========================= */
export function formatCurrency(value: number | string) {
  const num = parseNumber(value);

  return num.toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
}

/* =========================
   ID GENERATOR (fallback)
========================= */
export function generateId() {
  return crypto.randomUUID();
}
