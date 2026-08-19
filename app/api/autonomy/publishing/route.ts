import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withRole } from "@/server/lib/auth";
import {
  createPreviewChannel,
  createPreviewPublishJob,
  getPublishingOverview,
  supportedPlatforms,
} from "@/server/services/publishing.service";

export const dynamic = "force-dynamic";

const channelSchema = z.object({
  platform: z.enum(supportedPlatforms),
  displayName: z.string().trim().min(2).max(100),
  externalAccountId: z.string().trim().max(160).optional(),
});

const jobSchema = z.object({
  draftId: z.string().uuid(),
  channelId: z.string().uuid(),
  scheduledFor: z.string().datetime().optional(),
});

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const data = await getPublishingOverview(user.id);
    return NextResponse.json({ success: true, data });
  });
}

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;

    if (mode === "channel") {
      const parsed = channelSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid channel payload" }, { status: 400 });
      const channel = await createPreviewChannel(user.id, parsed.data);
      return NextResponse.json({ success: true, data: channel }, { status: 201 });
    }

    if (mode === "job") {
      const parsed = jobSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid preview job payload" }, { status: 400 });
      try {
        const job = await createPreviewPublishJob(user.id, parsed.data);
        return NextResponse.json({ success: true, data: job }, { status: 201 });
      } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unable to create preview job" }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: "mode must be channel or job" }, { status: 400 });
  });
}
