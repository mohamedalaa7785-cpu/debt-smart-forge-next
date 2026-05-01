import { NextResponse } from "next/server";
import { checkDb } from "@/server/db";
import { getEnvHealth } from "@/lib/env";
import { logger } from "@/server/core/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const envHealth = getEnvHealth();
    const dbHealthy = await checkDb();

    const status = dbHealthy ? "ok" : "degraded";
    const statusCode = dbHealthy ? 200 : 503;

    logger.info("Health check", {
      status,
      dbHealthy,
      requiredEnvCount: envHealth.required.length,
      checkedEnvCount: envHealth.checked.length,
    });

    return NextResponse.json(
      {
        success: true,
        status,
        service: "debt-smart-forge-next",
        timestamp: new Date().toISOString(),
        database: {
          healthy: dbHealthy,
          message: dbHealthy ? "Connected" : "Connection failed",
        },
        environment: {
          required: envHealth.required,
          optional: envHealth.optional,
          checked: envHealth.checked,
          allRequiredPresent: envHealth.required.every((name) =>
            envHealth.checked.includes(name)
          ),
        },
      },
      { status: statusCode }
    );
  } catch (error) {
    logger.error("Health check failed", {
      error: String((error as Error)?.message || error),
    });

    return NextResponse.json(
      {
        success: false,
        status: "error",
        service: "debt-smart-forge-next",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
        error: String((error as Error)?.message || "Unknown error"),
      },
      { status: 500 }
    );
  }
}
