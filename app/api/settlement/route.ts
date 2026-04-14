import { NextRequest, NextResponse } from "next/server";
import { simulateSettlement } from "@/server/services/financial.service";
import { requireUser } from "@/server/lib/auth";
import { SettlementBodySchema } from "@/lib/validators/api";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const rawBody = await req.json();

    const parsed = SettlementBodySchema.safeParse({
      originalBalance: Number(rawBody?.originalBalance),
      haircutPercentage: Number(rawBody?.haircutPercentage),
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid settlement payload" }, { status: 400 });
    }

    const result = simulateSettlement(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "Failed to simulate settlement" }, { status: 500 });
  }
}
