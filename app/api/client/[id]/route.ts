// file: app/api/client/[id]/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { buildClientIntelligenceProfile } from "@/server/services/intelligence.service";
import { logAction } from "@/server/services/log.service";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(async (user) => {
    try {
      const clientId = context.params?.id;

      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID missing" },
          { status: 400 }
        );
      }

      const data = await getClientById(clientId, user.id, user.role);

      if (!data) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 }
        );
      }


      /* =========================
         SAFE DATA
      ========================= */
      const phones = data.phones ?? [];
      const addresses = data.addresses ?? [];
      const loans = data.loans ?? [];
      const osint = data.osint ?? null;
      const actions = data.actions ?? [];

      /* =========================
         TOTAL DUE
      ========================= */
      const totalDue = loans.reduce(
        (sum: number, l: any) =>
          sum + (parseFloat(l.amountDue as any) || 0),
        0
      );

      /* =========================
         RISK
      ========================= */
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

      /* =========================
         AI SAFE WRAPPER 🔥
      ========================= */
      let aiResult: any = null;
      let script: any = null;

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

      /* =========================
         DECISION ENGINE
      ========================= */
      const aiSafe = aiResult || {
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

      /* =========================
         LOG
      ========================= */
      await logAction(user.id, "VIEW_CLIENT", {
        clientId,
        risk: risk.label,
        nextAction: decision.action,
      });

      /* =========================
         RESPONSE
      ========================= */
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
    } catch (error: any) {

      return NextResponse.json(
        {
          success: false,
          error: error.message || "Internal Server Error",
        },
        { status: 500 }
      );
    }
  });
}
