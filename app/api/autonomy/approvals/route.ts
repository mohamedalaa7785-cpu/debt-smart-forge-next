import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { autonomyApprovals, autonomyRuns, autonomyTasks, contentDrafts } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { taskId?: string; status?: string; reason?: string };
    if (!body.taskId || !["approved", "rejected"].includes(body.status || "")) {
      return NextResponse.json({ success: false, error: "taskId and a valid status are required" }, { status: 400 });
    }

    const task = await db.query.autonomyTasks.findFirst({
      where: eq(autonomyTasks.id, body.taskId),
    });
    if (!task) return NextResponse.json({ success: false, error: "Task not found" }, { status: 404 });

    const run = await db.query.autonomyRuns.findFirst({
      where: and(eq(autonomyRuns.id, task.runId), eq(autonomyRuns.ownerId, user.id)),
    });
    if (!run) return NextResponse.json({ success: false, error: "Task is not owned by the current account" }, { status: 403 });

    const [approval] = await db
      .update(autonomyApprovals)
      .set({ status: body.status, reason: body.reason || null, reviewerId: user.id, reviewedAt: new Date() })
      .where(and(eq(autonomyApprovals.taskId, body.taskId), eq(autonomyApprovals.runId, run.id), eq(autonomyApprovals.status, "pending")))
      .returning();

    if (!approval) return NextResponse.json({ success: false, error: "Approval not found or already reviewed" }, { status: 404 });
    await db.update(autonomyTasks).set({ status: body.status, completedAt: new Date() }).where(eq(autonomyTasks.id, body.taskId));
    if (body.status === "approved") {
      await db.update(contentDrafts).set({ status: "approved", updatedAt: new Date() }).where(eq(contentDrafts.taskId, body.taskId));
    }
    return NextResponse.json({ success: true, data: approval });
  });
}
