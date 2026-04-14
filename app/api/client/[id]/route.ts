export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript, type AIResult } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { buildClientIntelligenceProfile } from "@/server/services/intelligence.service";
import { logAction } from "@/server/services/log.service";
import { ValidationError, handleApiError } from "@/server/core/error.handler";

const FALLBACK_AI: AIResult = {
  behaviorPrediction: "unknown",
  paymentProbability: 0,
  strategy: "fallback",
  tone: "balanced",
  nextAction: "CALL",
  summary: "No AI summary",
  confidence: 0,
  redFlags: [],
  strengths: [],
  riskBoost: 0,
  urgency: 0,
};

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  return withAuth(async (user) => {
    try {
      const clientId = context.params?.id;
      if (!clientId) {
        throw new ValidationError("Client ID missing");
      }

      const data = await getClientById(clientId, user.id, user.role);
      if (!data) {
        return NextResponse.json({ success: false, error: "Client not found" }, { status: 404 });
      }

      const phones = data.phones ?? [];
      const addresses = data.addresses ?? [];
      const loans = data.loans ?? [];
      const osint = data.osint ?? null;
      const actions = data.actions ?? [];

      const totalDue = loans.reduce((sum: number, loan) => sum + Number(loan.amountDue || 0), 0);

      const risk = calculateRisk({
        bucket: loans[0]?.bucket ?? undefined,
        amountDue: totalDue,
        hasPhone: phones.length > 0,
        hasAddress: addresses.length > 0,
        hasLoans: loans.length > 0,
        hasOsint: !!osint,
        lastActionDays: 0,
        aiSignalsScore: 50,
      });

      let aiResult: AIResult | null = null;
      let script: Awaited<ReturnType<typeof generateCallScript>> | null = null;

      try {
        const aiInput = {
          clientName: data.name || "Unknown",
          totalAmountDue: totalDue,
          riskScore: risk.score,
          riskLabel: risk.label,
          phonesCount: phones.length,
          addressesCount: addresses.length,
          loansCount: loans.length,
          osintConfidence: Number(osint?.confidenceScore || 0),
          osintSummary: osint?.summary || "",
        };

        aiResult = await analyzeClient(aiInput);
        script = await generateCallScript(aiInput, aiResult);
      } catch {
        aiResult = null;
        script = null;
      }

      const aiSafe = aiResult || FALLBACK_AI;

      const decision = decideAction({
        risk,
        ai: aiSafe,
        osintConfidence: Number(osint?.confidenceScore || 0),
        lastActionDays: 0,
        totalDue,
      });

      const intelligence = buildClientIntelligenceProfile({
        client: {
          name: data.name,
          phones,
          addresses,
          actions,
          loans,
          osint,
        },
        ai: aiSafe,
        riskScore: risk.score,
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
          actions,
          osint,
          risk,
          ai: aiResult,
          script,
          decision,
          intelligence,
          totalDue,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
