import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { socialChannels } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

const ChannelSchema = z.object({
  platform: z.enum(["linkedin", "instagram", "x"]),
  displayName: z.string().trim().min(2).max(120),
  externalAccountId: z.string().trim().max(160).optional(),
  rateLimitPerDay: z.number().int().min(1).max(100).default(20),
});

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const channels = await db.query.socialChannels.findMany({
      where: eq(socialChannels.ownerId, user.id),
      orderBy: [desc(socialChannels.createdAt)],
      limit: 50,
    });
    return NextResponse.json({ success: true, data: channels });
  });
}

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const parsed = ChannelSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ success: false, error: "بيانات القناة غير صالحة." }, { status: 400 });
    const [channel] = await db.insert(socialChannels).values({
      ownerId: user.id,
      platform: parsed.data.platform,
      displayName: parsed.data.displayName,
      externalAccountId: parsed.data.externalAccountId,
      status: "draft",
      dryRunOnly: true,
      config: { mode: "preview", externalPublishingEnabled: false, rateLimitPerDay: parsed.data.rateLimitPerDay },
    }).returning();
    return NextResponse.json({ success: true, data: channel }, { status: 201 });
  });
}

export async function PATCH(request: NextRequest) {
  return withRole(["admin", "hidden_admin"], async (user) => {
    const body = await request.json().catch(() => ({})) as { id?: string; status?: string };
    if (!body.id || !["draft", "preview", "enabled", "paused"].includes(body.status || "")) {
      return NextResponse.json({ success: false, error: "معرف القناة والحالة مطلوبان." }, { status: 400 });
    }
    if (body.status === "enabled") {
      return NextResponse.json({ success: false, error: "يتطلب التفعيل الخارجي ربط موصل موثق وموافقة نشر مستقلة." }, { status: 409 });
    }
    const [updated] = await db.update(socialChannels)
      .set({ status: body.status, dryRunOnly: true, updatedAt: new Date(), config: { mode: body.status === "preview" ? "preview" : "disabled", externalPublishingEnabled: false } })
      .where(and(eq(socialChannels.id, body.id), eq(socialChannels.ownerId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ success: false, error: "القناة غير موجودة." }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  });
}
