import { NextResponse } from "next/server";

export type ApiErrorType = "auth" | "validation" | "db" | "forbidden" | "internal";

export class ApiError extends Error {
  constructor(
    public readonly type: ApiErrorType,
    public readonly status: number,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export class AuthError extends ApiError {
  constructor(message = "Unauthorized", status = 401, details?: Record<string, unknown>) {
    super("auth", status, message, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Invalid request", details?: Record<string, unknown>) {
    super("validation", 400, message, details);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: Record<string, unknown>) {
    super("forbidden", 403, message, details);
  }
}

export class DbError extends ApiError {
  constructor(message = "Database error", details?: Record<string, unknown>) {
    super("db", 500, message, details);
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Too many requests", details?: Record<string, unknown>) {
    super("forbidden", 429, message, details);
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        type: error.type,
      },
      { status: error.status }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: "Internal server error",
      type: "internal",
    },
    { status: 500 }
  );
}
