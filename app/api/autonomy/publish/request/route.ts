import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { contentDrafts, socialPublishRequests } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";
const supportedPlatforms = new Set(["linkedin", "facebook", "instagram", "x"]);

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { draftId?: string };
    if (!body.draftId) return NextResponse.json({ success: false, error: "draftId is required" }, { status: 400 });
    const draft = await db.query.contentDrafts.findFirst({ where: and(eq(contentDrafts.id, body.draftId), eq(contentDrafts.ownerId, user.id)) });
    if (!draft) return NextResponse.json({ success: false, error: "Draft not found" }, { status: 404 });
    if (draft.status !== "approved") return NextResponse.json({ success: false, error: "The draft must be approved first" }, { status: 409 });
    if (!supportedPlatforms.has(draft.platform)) return NextResponse.json({ success: false, error: "Unsupported platform" }, { status: 422 });
    const existing = await db.query.socialPublishRequests.findFirst({ where: and(eq(socialPublishRequests.draftId, draft.id), eq(socialPublishRequests.status, "pending")) });
    if (existing) return NextResponse.json({ success: true, data: existing, reused: true });
    const [publishRequest] = await db.insert(socialPublishRequests).values({
      ownerId: user.id,
      draftId: draft.id,
      platform: draft.platform,
      requestedBy: user.id,
      status: "pending",
      metadata: { externalRequestSent: false, requiresPlatformApproval: true },
    }).returning();
    return NextResponse.json({ success: true, data: publishRequest, mode: "approval_queue", externalRequestSent: false }, { status: 201 });
  });
}
