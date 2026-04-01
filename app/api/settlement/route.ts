import { NextRequest, NextResponse } from "next/server";
import { simulateSettlement } from "@/server/services/financial.service";
import { requireUser } from "@/server/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();

    const { originalBalance, haircutPercentage } = body;

    if (!originalBalance || !haircutPercentage) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = simulateSettlement({
      originalBalance: Number(originalBalance),
      haircutPercentage: Number(haircutPercentage),
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to simulate settlement" },
      { status: 500 }
    );
  }
}
