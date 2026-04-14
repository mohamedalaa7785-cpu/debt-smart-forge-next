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

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type ClientRef = { id: string };
type LoanRef = { balance: unknown; overdue: unknown };
type OsintRef = { confidenceScore: unknown };
type FraudRef = { level: string | null };

export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();

    /* ================= CLIENTS ================= */
    const scopedClients = await getClientsForUser(user.id, user.role);
    const clientIds = (scopedClients as ClientRef[]).map((c) => c.id);

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
      (sum: number, l: LoanRef) => sum + n(l.balance),
      0
    );

    const totalOverdue = loans.reduce(
      (sum: number, l: LoanRef) => sum + n(l.overdue),
      0
    );

    const avgRisk =
      (osint as OsintRef[]).reduce((sum: number, o) => sum + n(o.confidenceScore), 0) /
      (osint.length || 1);

    const highRisk = (osint as OsintRef[]).filter((o) => n(o.confidenceScore) >= 70).length;

    const fraudCount = (fraud as FraudRef[]).filter((f) => f.level === "high").length;

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

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unauthorized",
      },
      { status: 401 }
    );
  }
}
