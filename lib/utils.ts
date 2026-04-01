/* =========================
   SAFE NUMBER PARSER
========================= */
export function parseNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;

  const num = Number(value);

  if (!isFinite(num)) return fallback;

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
    if (!value || typeof value !== "string") return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/* =========================
   DATE HELPERS
========================= */
export function daysBetween(date: string | Date): number {
  const time = new Date(date).getTime();

  if (!time) return 0;

  const diff = Date.now() - time;

  return Math.max(0, Math.floor(diff / 86400000));
}

/* =========================
   BUCKET CALCULATION
========================= */
export function calculateBucketFromDate(
  dueDate?: string | Date
): number {
  if (!dueDate) return 1;

  const days = daysBetween(dueDate);

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
  const penaltyAmount = parseNumber(params.penaltyAmount);

  const base = emi * bucket;

  if (!penaltyEnabled || penaltyAmount <= 0) {
    return base;
  }

  return base + penaltyAmount * bucket;
}

/* =========================
   RISK LABEL (EXTENDED)
========================= */
export function getRiskLabel(
  score: number
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 120) return "CRITICAL";
  if (score >= 80) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

/* =========================
   STRING HELPERS
========================= */
export function normalizeString(value: string = "") {
  return value.trim().toLowerCase();
}

export function containsText(source: string, query: string) {
  return normalizeString(source).includes(normalizeString(query));
}

/* =========================
   ARRAY HELPERS
========================= */
export function uniqueArray<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/* =========================
   PHONE FORMAT (GLOBAL READY)
========================= */
export function normalizePhone(phone: string) {
  if (!phone) return "";

  return phone.replace(/[^\d]/g, "");
}

/* =========================
   WHATSAPP LINK (SMART)
========================= */
export function buildWhatsAppLink(
  phone: string,
  message?: string
) {
  const clean = normalizePhone(phone);

  const text = message
    ? `?text=${encodeURIComponent(message)}`
    : "";

  return `https://wa.me/${clean}${text}`;
}

/* =========================
   CURRENCY FORMAT
========================= */
export function formatCurrency(value: number | string) {
  const num = parseNumber(value);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(num);
}

/* =========================
   ID GENERATOR
========================= */
export function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "id-" + Math.random().toString(36).slice(2);
}

/* =========================
   CLAMP (VERY IMPORTANT 🔥)
========================= */
export function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.max(min, Math.min(max, value));
}
