export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientLoans } from "@/server/db/schema";

export async function GET() {
  try {
    const allClients = await db.select().from(clients);
    const allLoans = await db.select().from(clientLoans);

    const totalClients = allClients.length;

    const totalBalance = allLoans.reduce(
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
  } catch {
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
