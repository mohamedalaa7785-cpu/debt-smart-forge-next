import { db } from "@/server/db";
import { clientActions, clients } from "@/server/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";

export interface CollectorPerformance {
  collectorId: string;
  responseRate: number;
  recoveryRate: number;
  actionsCount: number;
}

export async function getCollectorPerformance(days = 30): Promise<CollectorPerformance[]> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      collectorId: clients.ownerId,
      actionsCount: sql<number>`count(${clientActions.id})`,
      responses: sql<number>`sum(case when ${clientActions.result} is not null then 1 else 0 end)`,
      paidActions: sql<number>`sum(case when coalesce(${clientActions.amountPaid}, '0')::numeric > 0 then 1 else 0 end)`,
    })
    .from(clients)
    .leftJoin(clientActions, eq(clientActions.clientId, clients.id))
    .where(gte(clientActions.createdAt, from))
    .groupBy(clients.ownerId);

  return rows
    .filter((row) => Boolean(row.collectorId))
    .map((row) => ({
      collectorId: row.collectorId as string,
      actionsCount: Number(row.actionsCount || 0),
      responseRate:
        Number(row.actionsCount || 0) === 0
          ? 0
          : Math.round((Number(row.responses || 0) / Number(row.actionsCount || 1)) * 100),
      recoveryRate:
        Number(row.actionsCount || 0) === 0
          ? 0
          : Math.round((Number(row.paidActions || 0) / Number(row.actionsCount || 1)) * 100),
    }));
}
