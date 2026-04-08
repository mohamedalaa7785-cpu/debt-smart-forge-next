type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: any;
}

/* 🔥 safe stringify (avoid circular crash) */
function safeStringify(obj: any) {
  try {
    return JSON.stringify(obj);
  } catch {
    return JSON.stringify({ error: "Failed to stringify meta" });
  }
}

/* 🔥 generate request id */
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function formatLog(
  level: LogLevel,
  message: string,
  meta?: LogMeta
) {
  return {
    level,
    message,
    meta,
    env: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    requestId: generateId(),
  };
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    console.log(safeStringify(formatLog("info", message, meta)));
  },

  warn(message: string, meta?: LogMeta) {
    console.warn(safeStringify(formatLog("warn", message, meta)));
  },

  error(message: string, meta?: LogMeta) {
    const log = formatLog("error", message, meta);

    /* 🔥 attach stack if exists */
    if (meta?.error instanceof Error) {
      log.meta = {
        ...meta,
        stack: meta.error.stack,
      };
    }

    console.error(safeStringify(log));
  },
};
