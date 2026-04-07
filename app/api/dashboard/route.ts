export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clientLoans } from "@/server/db/schema";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/server/lib/auth";
import { getClientsForUser } from "@/server/services/client.service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const scopedClients = await getClientsForUser(user.id, user.role);
    const clientIds = scopedClients.map((c: any) => c.id);

    const scopedLoans = clientIds.length
      ? await db.select().from(clientLoans).where(inArray(clientLoans.clientId, clientIds))
      : [];

    const totalClients = scopedClients.length;
    const totalBalance = scopedLoans.reduce(
      (sum: number, l: any) => sum + Number(l.balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        totalBalance,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
