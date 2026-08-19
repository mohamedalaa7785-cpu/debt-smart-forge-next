import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { autonomyRuns, autonomyTasks, contentDrafts } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

const supportedPlatforms = new Set(["linkedin", "facebook", "instagram", "x"]);

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { draftId?: string };
    if (!body.draftId) {
      return NextResponse.json({ success: false, error: "draftId is required" }, { status: 400 });
    }

    const draft = await db.query.contentDrafts.findFirst({
      where: and(eq(contentDrafts.id, body.draftId), eq(contentDrafts.ownerId, user.id)),
    });
    if (!draft) return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
    if (draft.status !== "approved") {
      return NextResponse.json({ success: false, error: "The draft needs content approval before publishing preview." }, { status: 409 });
    }
    if (!supportedPlatforms.has(draft.platform)) {
      return NextResponse.json({ success: false, error: "Unsupported publishing platform" }, { status: 422 });
    }

    const task = draft.taskId
      ? await db.query.autonomyTasks.findFirst({ where: eq(autonomyTasks.id, draft.taskId) })
      : null;
    const run = task
      ? await db.query.autonomyRuns.findFirst({ where: and(eq(autonomyRuns.id, task.runId), eq(autonomyRuns.ownerId, user.id)) })
      : null;

    return NextResponse.json({
      success: true,
      mode: "preview",
      data: {
        draftId: draft.id,
        platform: draft.platform,
        title: draft.title,
        body: draft.body,
        runId: run?.id ?? null,
        requiresSeparatePublishApproval: true,
        externalRequestSent: false,
        nextStep: "Configure and verify the platform connector, then request a separate publish approval.",
      },
    });
  });
}
