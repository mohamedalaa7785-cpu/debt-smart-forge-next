import { NextResponse } from "next/server";
import { logger } from "@/server/core/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Check required environment variables
    const requiredEnvs = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "DATABASE_URL",
    ];

    const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

    if (missingEnvs.length > 0) {
      logger.warn("Health check: Missing environment variables", {
        missing: missingEnvs,
      });
      return NextResponse.json(
        {
          success: true,
          status: "degraded",
          service: "debt-smart-forge-next",
          timestamp: new Date().toISOString(),
          message: `Missing environment variables: ${missingEnvs.join(", ")}`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        status: "ok",
        service: "debt-smart-forge-next",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Health check error", {
      error: String((error as Error)?.message || error),
    });
    return NextResponse.json(
      {
        success: false,
        status: "error",
        service: "debt-smart-forge-next",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
      },
      { status: 500 }
    );
  }
}
