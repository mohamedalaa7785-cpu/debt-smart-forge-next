import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientBundlesByIds, getClientsForUser } from "@/server/services/client.service";
import { analyzeClient } from "@/server/services/ai.service";
import { handleApiError } from "@/server/core/error.handler";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const baseClients = await getClientsForUser(user.id, user.role);
      const limitedClients = baseClients.slice(0, 20);
      const bundles = await getClientBundlesByIds(
        limitedClients.map((c) => c.id),
        user.id,
        user.role
      );

      const result = await Promise.all(
        bundles.map(async (fullData) => {
          const totalDue = fullData.loans.reduce((sum, l) => sum + Number(l.overdue || 0), 0);
          const lastAction = fullData.actions[0]?.createdAt;
          const lastActionDays = lastAction
            ? Math.floor((Date.now() - new Date(lastAction).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          const ai = await analyzeClient({
            clientName: fullData.name || "Unknown",
            totalAmountDue: totalDue,
            lastActionDays,
            phonesCount: fullData.phones.length,
          });

          const priority = totalDue / 100 + ai.paymentProbability * 0.5 + lastActionDays * 2;

          return {
            id: fullData.id,
            name: fullData.name,
            phone: fullData.phones[0]?.phone || "",
            totalDue,
            lastActionDays,
            ai,
            priority,
          };
        })
      );

      result.sort((a, b) => b.priority - a.priority);

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
