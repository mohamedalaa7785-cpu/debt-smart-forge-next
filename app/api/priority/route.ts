import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientLoans } from "@/server/db/schema";
import { desc } from "drizzle-orm";

/* =========================
   PRIORITY ENGINE 🔥
========================= */
export async function GET() {
  try {
    const data = await db
      .select({
        id: clients.id,
        name: clients.name,
        balance: clientLoans.balance,
      })
      .from(clients)
      .leftJoin(
        clientLoans,
        (fields, { eq }) =>
          eq(fields.clients.id, fields.clientLoans.clientId)
      )
      .orderBy(desc(clientLoans.balance));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Priority failed" },
      { status: 500 }
    );
  }
}
