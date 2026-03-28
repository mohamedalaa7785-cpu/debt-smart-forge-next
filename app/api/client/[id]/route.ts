import { NextResponse } from "next/server";
import { getClientById } from "@/server/services/client.service";
import { analyzeClientWithAI } from "@/server/services/ai.service";

/* =========================
   GET FULL CLIENT PROFILE
========================= */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id;

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    const profile = await getClientById(clientId);

    if (!profile) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    /* =========================
       AI ANALYSIS
    ========================= */
    const ai = await analyzeClientWithAI({
      clientName: profile.client.name,
      totalAmountDue: profile.summary.totalAmountDue,
      totalBalance: profile.summary.totalBalance,
      totalEMI: profile.summary.totalEMI,
      riskScore: profile.summary.riskScore,
      riskLabel: profile.summary.riskLabel,
      lastActionDays: profile.actions.length
        ? Math.floor(
            (Date.now() -
              new Date(profile.actions[0].createdAt).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 999,
      phonesCount: profile.phones.length,
      addressesCount: profile.addresses.length,
      loansCount: profile.loans.length,
      osintConfidence: profile.osint?.confidenceScore ?? 0,
      osintSummary: profile.osint?.summary ?? null,
      actions: profile.actions.map((a) => ({
        actionType: a.actionType,
        note: a.note,
        createdAt: a.createdAt,
      })),
      loanTypes: profile.loans.map((l) => l.loanType),
    });

    return NextResponse.json({
      ...profile,
      ai,
    });
  } catch (error) {
    console.error("GET /client/[id] error:", error);

    return NextResponse.json(
      { error: "Failed to fetch client profile" },
      { status: 500 }
    );
  }
        }
