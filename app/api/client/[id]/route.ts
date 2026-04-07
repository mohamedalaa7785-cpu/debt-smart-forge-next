import { NextRequest, NextResponse } from "next/server";
import { getClientById } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { withApiGuard } from "@/server/lib/auth";
import { auditSensitiveAction } from "@/server/services/audit.service";

function success(data: any, meta?: any) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}

function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withApiGuard(req, { method: "GET", route: "/api/client/:id" }, async (user) => {
    if (!user) return fail("Unauthorized", 401);

    try {
      const clientId = params?.id?.trim();
      if (!clientId) return fail("Client ID is required", 400);

      const data = await getClientById(clientId, { userId: user.id, role: user.role });
      if (!data) return fail("Client not found", 404);

      const phones = data.phones || [];
      const addresses = data.addresses || [];
      const actions = data.actions || [];
      const osint = data.osint || null;

      const totalDue = (data.loans || []).reduce((sum: number, l: any) => sum + (parseFloat(l.amountDue as any) || 0), 0);

      const risk = calculateRisk({
        bucket: data.loans?.[0]?.bucket ?? undefined,
        amountDue: totalDue,
        hasPhone: phones.length > 0,
        hasAddress: addresses.length > 0,
        hasLoans: (data.loans?.length || 0) > 0,
        hasOsint: !!osint,
        lastActionDays: 0,
        aiSignalsScore: 50
      });

      const aiInput = {
        clientName: data.name || "Unknown",
        totalAmountDue: totalDue,
        riskScore: risk.score,
        riskLabel: risk.label,
        phonesCount: phones.length,
        addressesCount: addresses.length,
        loansCount: data.loans?.length || 0,
        osintConfidence: osint?.confidenceScore as any || 0,
        osintSummary: osint?.summary
      };

      const aiResult = await analyzeClient(aiInput);
      const script = await generateCallScript(aiInput, aiResult);
      const decision = decideAction({ risk, ai: aiResult, osintConfidence: osint?.confidenceScore as any || 0, lastActionDays: 0, totalDue });

      await auditSensitiveAction(user.id, "CLIENT_VIEW_DETAIL", { clientId });
      await auditSensitiveAction(user.id, "CLIENT_DECISION_VIEW", { clientId, decision: decision.action, priority: decision.priority });

      return success(
        { client: data, phones, addresses, loans: data.loans || [], actions, osint, risk, ai: aiResult, script, decision },
        {
          risk: risk.label,
          riskScore: risk.score,
          totalDue,
          hasOSINT: !!osint,
          hasPhones: phones.length > 0,
          hasAddresses: addresses.length > 0,
          priority: decision.priority,
          actionRequired: risk.score >= 50,
          nextAction: decision.action
        }
      );
    } catch (error) {
      console.error("GET CLIENT ERROR:", error);
      return fail("Failed to fetch client", 500);
    }
  });
}
