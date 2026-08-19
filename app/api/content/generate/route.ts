import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { contentDrafts } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";
import { generateGrowthContent, type GrowthContent } from "@/server/services/growth-content.service";

export const dynamic = "force-dynamic";

const platforms: GrowthContent["platform"][] = ["linkedin", "facebook", "instagram", "x"];

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { topic?: string; platform?: GrowthContent["platform"]; save?: boolean };
    const topic = body.topic?.trim();
    const platform = body.platform || "linkedin";
    if (!topic || !platforms.includes(platform)) {
      return NextResponse.json({ success: false, error: "topic and a supported platform are required" }, { status: 400 });
    }
    const content = await generateGrowthContent(topic, platform);
    if (!body.save) return NextResponse.json({ success: true, data: { content, persisted: false } });
    const [draft] = await db.insert(contentDrafts).values({
      ownerId: user.id,
      platform: content.platform,
      title: content.title,
      body: `${content.body}\n\n${content.callToAction}\n\n${content.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}`,
      status: "draft",
      metadata: { safetyNotes: content.safetyNotes, generatedBy: "growth-content" },
    }).returning();
    return NextResponse.json({ success: true, data: { content, draft, persisted: true } }, { status: 201 });
  });
}
