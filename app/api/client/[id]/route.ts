// file: app/api/client/[id]/route.ts

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById, canAccessClient } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { logAction } from "@/server/services/log.service";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return withAuth(req, async (user) => {
    try {
      const clientId = context.params?.id;

      if (!clientId) {
        return NextResponse.json(
          { success: false, error: "Client ID missing" },
          { status: 400 }
        );
      }

      const data = await getClientById(clientId);

      if (!data) {
        return NextResponse.json(
          { success: false, error: "Client not found" },
          { status: 404 }
        );
      }

      if (!canAccessClient(data as any, user.id, user.role)) {
        return NextResponse.json(
          { success: false, error: "Forbidden" },
          { status: 403 }
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
      } catch (err) {
        console.error("AI ERROR:", err);
      }

      /* =========================
         DECISION ENGINE
      ========================= */
      const decision = decideAction({
        risk,
        ai: aiResult,
        osintConfidence: Number(osint?.confidenceScore || 0),
        lastActionDays: 0,
        totalDue,
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
          totalDue,
        },
      });
    } catch (error: any) {
      console.error("GET CLIENT ERROR:", error);

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
