import { NextRequest, NextResponse } from "next/server";
import { getClientById } from "@/server/services/client.service";

/* =========================
   HELPERS
========================= */
function success(data: any, meta?: any) {
  return NextResponse.json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

function fail(error: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/* =========================
   GET FULL CLIENT PROFILE 🔥
========================= */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params?.id?.trim();

    /* =========================
       VALIDATION
    ========================= */
    if (!clientId) {
      return fail("Client ID is required", 400);
    }

    /* =========================
       FETCH DATA
    ========================= */
    const data = await getClientById(clientId);

    if (!data) {
      return fail("Client not found", 404);
    }

    /* =========================
       SAFE FALLBACKS
    ========================= */
    const summary = data.summary || {};
    const phones = data.phones || [];
    const addresses = data.addresses || [];
    const actions = data.actions || [];
    const osint = data.osint || null;
    const ai = data.ai || null;

    /* =========================
       PRIORITY ENGINE 🔥
    ========================= */
    const priority =
      (summary.totalAmountDue || 0) * 0.5 +
      (summary.riskScore || 0) * 10 -
      (summary.lastActionDays || 0) * 2 +
      (ai?.urgency || 0);

    /* =========================
       FINAL RESPONSE
    ========================= */
    return success(
      {
        /* BASIC */
        client: data.client,

        /* RELATIONS */
        phones,
        addresses,
        loans: data.loans || [],

        /* TIMELINE */
        actions,

        /* OSINT */
        osint,

        /* SUMMARY */
        summary: {
          ...summary,
          priorityScore: Math.max(0, Math.round(priority)),
        },

        /* AI */
        ai,
      },

      /* =========================
         META (DECISION LAYER)
      ========================= */
      {
        risk: summary.riskLabel,
        riskScore: summary.riskScore,

        totalDue: summary.totalAmountDue,

        hasOSINT: !!osint,
        hasPhones: phones.length > 0,
        hasAddresses: addresses.length > 0,

        lastActionDays: summary.lastActionDays,

        priorityScore: Math.max(0, Math.round(priority)),

        actionRequired:
          summary.riskScore >= 50 ||
          summary.lastActionDays > 3,

        nextBestAction: ai?.nextAction || null,
      }
    );
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);

    return fail("Failed to fetch client", 500);
  }
       }
