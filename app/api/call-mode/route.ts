import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientsForUser, getClientById } from "@/server/services/client.service";
import { analyzeClient } from "@/server/services/ai.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const baseClients = await getClientsForUser(user.id, user.role);
      
      // Limit to top 20 for performance in call mode
      const result: any[] = [];
      const limitedClients = baseClients.slice(0, 20);

      for (const client of limitedClients) {
        const fullData = await getClientById(client.id);
        if (!fullData) continue;

        const totalDue = fullData.loans.reduce((sum, l) => sum + Number(l.overdue || 0), 0);
        const lastAction = fullData.actions[0]?.createdAt;
        const lastActionDays = lastAction 
          ? Math.floor((Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24)) 
          : 999;

        const ai = await analyzeClient({
          clientName: client.name || "Unknown",
          totalAmountDue: totalDue,
          lastActionDays,
          phonesCount: fullData.phones.length,
        });

        // Priority calculation: High due + high probability + long time since last action
        const priority = (totalDue / 1000) * 10 + (ai.paymentProbability) * 0.5 + (lastActionDays * 2);

        result.push({
          id: client.id,
          name: client.name,
          phone: fullData.phones[0]?.phone || "",
          totalDue,
          lastActionDays,
          ai,
          priority,
        });
      }

      result.sort((a, b) => b.priority - a.priority);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("CALL MODE API ERROR:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
  });
}
