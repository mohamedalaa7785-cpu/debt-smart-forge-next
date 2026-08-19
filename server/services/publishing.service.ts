import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { contentDrafts, publishJobs, socialChannels } from "@/server/db/schema";

export const supportedPlatforms = ["linkedin", "instagram", "facebook", "x"] as const;
export type SupportedPlatform = (typeof supportedPlatforms)[number];

export async function getPublishingOverview(ownerId: string) {
  const [channels, jobs] = await Promise.all([
    db.query.socialChannels.findMany({
      where: eq(socialChannels.ownerId, ownerId),
      orderBy: [desc(socialChannels.updatedAt)],
      limit: 25,
    }),
    db.query.publishJobs.findMany({
      where: eq(publishJobs.ownerId, ownerId),
      orderBy: [desc(publishJobs.createdAt)],
      limit: 50,
    }),
  ]);
  return { channels, jobs };
}

export async function createPreviewChannel(
  ownerId: string,
  input: { platform: SupportedPlatform; displayName: string; externalAccountId?: string },
) {
  const [channel] = await db
    .insert(socialChannels)
    .values({
      ownerId,
      platform: input.platform,
      displayName: input.displayName.trim(),
      externalAccountId: input.externalAccountId?.trim() || null,
      status: "draft",
      dryRunOnly: true,
      config: { mode: "preview", credentialsConfigured: false },
    })
    .returning();
  return channel;
}

export async function createPreviewPublishJob(ownerId: string, input: { draftId: string; channelId: string; scheduledFor?: string }) {
  const [draft, channel] = await Promise.all([
    db.query.contentDrafts.findFirst({
      where: and(eq(contentDrafts.id, input.draftId), eq(contentDrafts.ownerId, ownerId)),
    }),
    db.query.socialChannels.findFirst({
      where: and(eq(socialChannels.id, input.channelId), eq(socialChannels.ownerId, ownerId)),
    }),
  ]);

  if (!draft) throw new Error("Draft not found");
  if (!channel) throw new Error("Channel not found");
  if (draft.status !== "approved") throw new Error("Draft must be approved before scheduling");
  if (channel.status !== "draft" && channel.status !== "ready") throw new Error("Channel is not available");

  const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) throw new Error("Invalid scheduledFor");
  if (scheduledFor && scheduledFor.getTime() < Date.now()) throw new Error("scheduledFor must be in the future");

  const [job] = await db
    .insert(publishJobs)
    .values({
      ownerId,
      channelId: channel.id,
      draftId: draft.id,
      status: "preview",
      scheduledFor,
      previewPayload: {
        platform: channel.platform,
        displayName: channel.displayName,
        title: draft.title,
        body: draft.body,
        dryRunOnly: true,
        externalPublish: false,
      },
    })
    .returning();
  return job;
}
