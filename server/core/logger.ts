type LogLevel = "info" | "warn" | "error";

const EMAIL_RE = /([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_RE = /(\+?\d{2,3})?[-\s]?(\d{2})\d{4,8}(\d{2})/g;

function maskText(input: string): string {
  return input
    .replace(EMAIL_RE, "$1***$2")
    .replace(PHONE_RE, (_m, cc = "", start = "", end = "") => `${cc || ""}${start}****${end}`);
}

function sanitize(value: unknown): unknown {
  if (typeof value === "string") return maskText(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sanitize(v)])
    );
  }
  return value;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    meta: meta ? sanitize(meta) : undefined,
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
