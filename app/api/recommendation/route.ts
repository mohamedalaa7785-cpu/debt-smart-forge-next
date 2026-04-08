import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { getRecommendation } from "@/server/services/recommendation.service";
import { analyzeFraud } from "@/server/services/fraud.service";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId required" },
        { status: 400 }
      );
    }

    const client = await getClientById(
      clientId,
      user.id,
      user.role
    );

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    /* 🔥 FRAUD (needed for decision) */
    const fraud = await analyzeFraud({
      clientId,
      phones: client.phones?.map((p: any) => p.phone),
      loans: client.loans,
      osint: client.osint,
    });

    const recommendation = await getRecommendation({
      osint: client.osint,
      fraud,
      loans: client.loans,
    });

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Recommendation failed",
      },
      { status: 500 }
    );
  }
}
