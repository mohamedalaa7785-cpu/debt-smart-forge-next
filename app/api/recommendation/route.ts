import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { getRecommendation } from "@/server/services/recommendation.service";
import { analyzeFraud } from "@/server/services/fraud.service";

/* ================= CACHE ================= */

const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 5;

/* ================= MAIN ================= */

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

    /* 🔥 CACHE */
    const cached = cache.get(clientId);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        meta: { cached: true },
      });
    }

    /* 🔥 GET CLIENT */
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

    /* 🔥 RUN FRAUD + RECOMMENDATION PARALLEL */
    const [fraud, recommendation] = await Promise.all([
      analyzeFraud({
        clientId,
        phones: client.phones?.map((p: any) => p.phone),
        loans: client.loans,
        osint: client.osint,
      }),

      getRecommendation({
        osint: client.osint,
        loans: client.loans,
      }),
    ]);

    /* 🔥 PRIORITY ENGINE */
    let priority = "low";

    if (fraud.level === "critical") priority = "urgent";
    else if (fraud.level === "high") priority = "high";
    else if (fraud.level === "medium") priority = "medium";

    const response = {
      action: recommendation.action,
      reason: recommendation.reason,
      priority,
      fraud: {
        score: fraud.score,
        level: fraud.level,
        signals: fraud.signals,
      },
    };

    /* 🔥 SAVE CACHE */
    cache.set(clientId, {
      data: response,
      expiry: Date.now() + TTL,
    });

    return NextResponse.json({
      success: true,
      data: response,
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
