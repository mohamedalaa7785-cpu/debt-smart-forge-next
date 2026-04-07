import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById, canAccessClient } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { logAction } from "@/server/services/log.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(req, async (user) => {
    try {
      const clientId = params.id;
      const data = await getClientById(clientId);

      if (!data) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }

      if (!canAccessClient(data as any, user.id, user.role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }

      const phones = data.phones || [];
      const addresses = data.addresses || [];
      const loans = data.loans || [];
      const osint = data.osint || null;

      // Calculate total due
      const totalDue = loans.reduce((sum: number, l: any) => sum + (parseFloat(l.amountDue as any) || 0), 0);

      // Calculate risk
      const riskInput = {
        bucket: loans[0]?.bucket ?? undefined,
        amountDue: totalDue,
        hasPhone: phones.length > 0,
        hasAddress: addresses.length > 0,
        hasLoans: loans.length > 0,
        hasOsint: !!osint,
        lastActionDays: 0,
        aiSignalsScore: 50
      };
      const risk = calculateRisk(riskInput);

      // AI Analysis
      const aiInput = {
        clientName: data.name || "Unknown",
        totalAmountDue: totalDue,
        riskScore: risk.score,
        riskLabel: risk.label,
        phonesCount: phones.length,
        addressesCount: addresses.length,
        loansCount: loans.length,
        osintConfidence: Number(osint?.confidenceScore || 0),
        osintSummary: osint?.summary || ""
      };
      const aiResult = await analyzeClient(aiInput);

      // Generate script
      const script = await generateCallScript(aiInput, aiResult);

      // Decision engine
      const decision = decideAction({
        risk,
        ai: aiResult,
        osintConfidence: Number(osint?.confidenceScore || 0),
        lastActionDays: 0,
        totalDue
      });

      await logAction(user.id, "VIEW_CLIENT", {
        clientId,
        risk: risk.label,
        nextAction: decision.action,
      });

      return NextResponse.json({
        success: true,
        data: {
          client: data,
          phones,
          addresses,
          loans,
          actions: data.actions || [],
          osint,
          risk,
          ai: aiResult,
          script,
          decision,
          totalDue
        }
      });
    } catch (error: any) {
      console.error("GET CLIENT ERROR:", error);
      return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
  });
}
