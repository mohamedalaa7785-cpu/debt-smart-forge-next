export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientLoans, clientActions, clientPhones } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { analyzeClient } from "@/server/services/ai.service";
import { withApiGuard } from "@/server/lib/auth";

export async function GET(req: NextRequest) {
  return withApiGuard(req, { method: "GET", route: "/api/call-mode" }, async () => {
    try {
      const allClients = await db.select().from(clients).orderBy(desc(clients.createdAt)).limit(50);
      const result: any[] = [];
      for (const client of allClients) {
        const [loans, actions, phones] = await Promise.all([
          db.select().from(clientLoans).where(eq(clientLoans.clientId, client.id)),
          db.select().from(clientActions).where(eq(clientActions.clientId, client.id)).orderBy(desc(clientActions.createdAt)),
          db.select().from(clientPhones).where(eq(clientPhones.clientId, client.id)),
        ]);
        const totalDue = loans.reduce((sum: number, l: any) => sum + Number(l.balance || 0), 0);
        const lastActionDays = actions.length && actions[0].createdAt ? Math.floor((Date.now() - new Date(actions[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 999;
        const actionScore = actions.reduce((acc: number, a: any) => {
          if (a.actionType === "CALL") return acc + 5;
          if (a.actionType === "WHATSAPP") return acc + 3;
          if (a.actionType === "PROMISE") return acc + 10;
          if (a.actionType === "BROKEN_PROMISE") return acc - 10;
          return acc;
        }, 0);
        const ai = await analyzeClient({ clientName: client.name || "Unknown Client", totalAmountDue: totalDue, riskScore: actionScore, lastActionDays, phonesCount: phones.length });
        const priority = totalDue * 0.6 + actionScore * 5 + (ai?.paymentProbability || 0) * 2 - lastActionDays * 3;
        result.push({ id: client.id, name: client.name, phone: phones[0]?.phone || "", totalDue, lastActionDays, ai, priority });
      }
      result.sort((a, b) => b.priority - a.priority);
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      console.error("CALL MODE AI ERROR:", error);
      return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
    }
  });
}
