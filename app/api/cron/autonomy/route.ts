import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { autonomyGoals } from "@/server/db/schema";
import { startAutonomyRun } from "@/server/services/autonomy.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  return Boolean(secret && authorization === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const goals = await db.query.autonomyGoals.findMany({
    where: eq(autonomyGoals.status, "active"),
    columns: { ownerId: true },
    limit: 100,
  });
  const ownerIds = [...new Set(goals.map((goal) => goal.ownerId))];
  const results: Array<{ ownerId: string; success: boolean; runId?: string; error?: string }> = [];

  for (const ownerId of ownerIds) {
    try {
      const run = await startAutonomyRun(ownerId, "scheduled");
      results.push({ ownerId, success: true, runId: run.id });
    } catch (error) {
      results.push({ ownerId, success: false, error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
