import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
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

    const result = await analyzeFraud({
      clientId,
      phones: client.phones?.map((p: any) => p.phone),
      loans: client.loans,
      osint: client.osint,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Fraud failed",
      },
      { status: 500 }
    );
  }
}
