import { NextResponse } from "next/server";
import { getClientById } from "@/server/services/client.service";

/* =========================
   GET FULL CLIENT PROFILE 🔥
========================= */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clientId = params.id?.trim();

    /* =========================
       VALIDATION
    ========================= */
    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Client ID is required",
        },
        { status: 400 }
      );
    }

    /* =========================
       CORE SYSTEM CALL
    ========================= */
    const data = await getClientById(clientId);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Client not found",
        },
        { status: 404 }
      );
    }

    /* =========================
       FINAL STRUCTURE 🔥
    ========================= */
    return NextResponse.json({
      success: true,

      data: {
        /* BASIC */
        client: data.client,

        /* RELATIONS */
        phones: data.phones,
        addresses: data.addresses,
        loans: data.loans,

        /* TIMELINE */
        actions: data.actions,

        /* OSINT */
        osint: data.osint,

        /* SUMMARY */
        summary: data.summary,

        /* AI */
        ai: data.ai,
      },

      /* =========================
         META (DECISION LAYER)
      ========================= */
      meta: {
        risk: data.summary?.riskLabel,
        riskScore: data.summary?.riskScore,

        totalDue: data.summary?.totalAmountDue,

        hasOSINT: !!data.osint,
        hasPhones: data.phones?.length > 0,

        lastActionDays: data.summary?.lastActionDays,

        priority:
          (data.summary?.riskScore || 0) +
          (data.summary?.totalAmountDue || 0) / 1000,
      },
    });
  } catch (error) {
    console.error("GET CLIENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch client",
      },
      { status: 500 }
    );
  }
       }
