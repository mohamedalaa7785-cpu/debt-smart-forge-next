export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import {
  clientLoans,
  osintResults,
  fraudAnalysis,
} from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import { getClientsForUser } from "@/server/services/client.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    /* ================= CLIENTS ================= */
    const scopedClients = await getClientsForUser(user.id, user.role);
    const clientIds = scopedClients.map((c: any) => c.id);

    /* ================= LOANS ================= */
    const loans = clientIds.length
      ? await db
          .select()
          .from(clientLoans)
          .where(inArray(clientLoans.clientId, clientIds))
      : [];

    /* ================= OSINT ================= */
    const osint = clientIds.length
      ? await db
          .select()
          .from(osintResults)
          .where(inArray(osintResults.clientId, clientIds))
      : [];

    /* ================= FRAUD ================= */
    const fraud = clientIds.length
      ? await db
          .select()
          .from(fraudAnalysis)
          .where(inArray(fraudAnalysis.clientId, clientIds))
      : [];

    /* ================= CALCULATIONS ================= */

    const totalClients = scopedClients.length;

    const totalBalance = loans.reduce(
      (sum: number, l: any) => sum + Number(l.balance || 0),
      0
    );

    const totalOverdue = loans.reduce(
      (sum: number, l: any) => sum + Number(l.overdue || 0),
      0
    );

    const avgRisk =
      osint.reduce(
        (sum: number, o: any) => sum + Number(o.confidenceScore || 0),
        0
      ) / (osint.length || 1);

    const highRisk = osint.filter(
      (o: any) => Number(o.confidenceScore) >= 70
    ).length;

    const fraudCount = fraud.filter(
      (f: any) => f.level === "high"
    ).length;

    /* ================= RESPONSE ================= */

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        totalBalance,
        totalOverdue,
        avgRisk: Math.round(avgRisk),
        highRisk,
        fraudCount,
      },
    });
  } catch (error: any) {
    console.error("DASHBOARD ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unauthorized",
      },
      { status: 401 }
    );
  }
}
