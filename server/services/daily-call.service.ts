import { db } from "@/server/db";
import { clients, clientLoans, callLogs } from "@/server/db/schema";
import { eq, sql, desc, and, notInArray } from "drizzle-orm";

export interface CallListItem {
  id: string;
  name: string;
  totalDue: number;
  riskScore: number;
  lastContact?: string;
  priority: number;
  phone: string;
}

export async function generateDailyCallList(userId: string): Promise<CallListItem[]> {
  try {
    // 1. Get clients owned by user or assigned to them
    // 2. Calculate total due and risk (simplified for SQL)
    // 3. Sort by priority (Amount Due * Risk Factor)
    
    const results = await db.select({
      id: clients.id,
      name: clients.name,
      totalDue: sql<number>`SUM(${clientLoans.amountDue})`,
      maxBucket: sql<number>`MAX(${clientLoans.bucket})`,
    })
    .from(clients)
    .innerJoin(clientLoans, eq(clients.id, clientLoans.clientId))
    .where(eq(clients.ownerId, userId))
    .groupBy(clients.id)
    .orderBy(desc(sql`SUM(${clientLoans.amountDue}) * MAX(${clientLoans.bucket})`))
    .limit(50);

    return results.map(r => ({
      id: r.id,
      name: r.name || "Unknown",
      totalDue: r.totalDue || 0,
      riskScore: (r.maxBucket || 1) * 10,
      priority: (r.totalDue || 0) * (r.maxBucket || 1),
      phone: "N/A" // Would fetch from clientPhones in a real join
    }));
  } catch (error) {
    console.error("generateDailyCallList error:", error);
    return [];
  }
}
