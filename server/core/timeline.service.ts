import { db } from "@/server/db";
import { callLogs, clientActions } from "@/server/db/schema";
import { desc, eq } from "drizzle-orm";

export type TimelineEventType = "call" | "message" | "promise" | "action" | "note";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  at: string;
  note: string | null;
  actorId: string | null;
}

export async function getClientTimeline(clientId: string): Promise<TimelineEvent[]> {
  const [actions, calls] = await Promise.all([
    db.query.clientActions.findMany({
      where: eq(clientActions.clientId, clientId),
      orderBy: [desc(clientActions.createdAt)],
      limit: 100,
    }),
    db.query.callLogs.findMany({
      where: eq(callLogs.clientId, clientId),
      orderBy: [desc(callLogs.createdAt)],
      limit: 100,
    }),
  ]);

  const actionEvents: TimelineEvent[] = actions.map((a) => ({
    id: a.id,
    type: "action",
    at: a.createdAt.toISOString(),
    note: a.note || a.result,
    actorId: a.userId || null,
  }));

  const callEvents: TimelineEvent[] = calls.map((c) => ({
    id: c.id,
    type: "call",
    at: c.createdAt.toISOString(),
    note: c.note,
    actorId: c.userId || null,
  }));

  return [...actionEvents, ...callEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 200);
}
