import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { socialPublishRequests } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withRole(["admin", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { requestId?: string; action?: "approve" | "reject" };
    if (!body.requestId || !body.action) return NextResponse.json({ success: false, error: "requestId and action are required" }, { status: 400 });
    const status = body.action === "approve" ? "approved" : "rejected";
    const [updated] = await db.update(socialPublishRequests).set({
      status,
      approvedBy: user.id,
      approvedAt: new Date(),
      metadata: { externalRequestSent: false, publishApproval: status },
    }).where(and(eq(socialPublishRequests.id, body.requestId), eq(socialPublishRequests.ownerId, user.id), eq(socialPublishRequests.status, "pending"))).returning();
    if (!updated) return NextResponse.json({ success: false, error: "Publish request not found or already reviewed" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, externalRequestSent: false, nextStep: status === "approved" ? "Configure a verified platform connector and run the provider-specific publisher." : "No external request will be sent." });
  });
}
