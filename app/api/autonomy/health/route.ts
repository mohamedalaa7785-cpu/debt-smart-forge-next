import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { autonomyGoals, autonomyRuns } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

const STALE_RUN_MS = 30 * 60 * 1000;

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const [goal, runningRun] = await Promise.all([
      db.query.autonomyGoals.findFirst({
        where: and(eq(autonomyGoals.ownerId, user.id), eq(autonomyGoals.status, "active")),
        orderBy: [desc(autonomyGoals.updatedAt)],
      }),
      db.query.autonomyRuns.findFirst({
        where: and(eq(autonomyRuns.ownerId, user.id), eq(autonomyRuns.status, "running")),
        orderBy: [desc(autonomyRuns.startedAt)],
      }),
    ]);

    const now = Date.now();
    const runningSince = runningRun?.startedAt?.getTime() ?? null;
    const staleRun = Boolean(runningSince && now - runningSince > STALE_RUN_MS);
    const checks = {
      goalActive: Boolean(goal),
      noStaleRun: !staleRun,
      noConcurrentRun: Boolean(!runningRun || runningRun.status === "running"),
    };
    const healthy = Object.values(checks).every(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        status: healthy ? "healthy" : "degraded",
        checkedAt: new Date(now).toISOString(),
        checks,
        activeGoalId: goal?.id ?? null,
        runningRunId: runningRun?.id ?? null,
        staleRun,
        recovery: staleRun ? "Pause the goal, inspect the run log, and retry only after confirming the worker is stopped." : "No automatic mutation was performed.",
      },
    }, { status: healthy ? 200 : 503 });
  });
}
