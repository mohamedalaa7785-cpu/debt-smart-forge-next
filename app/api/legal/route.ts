import { NextRequest, NextResponse } from "next/server";
import { generateLegalNotice, getLegalCases, addLegalCase, trackBouncedCheck } from "@/server/services/legal.service";
import { requireUser } from "@/server/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    const { action, clientId, clientName, amountDue, bankName, date, checkNumber } = body;

    if (action === "generate_inzar") {
      const notice = await generateLegalNotice({
        clientName,
        amountDue,
        bankName,
        date,
      });

      return NextResponse.json({
        success: true,
        data: { notice },
      });
    }

    if (action === "get_cases") {
      const cases = await getLegalCases(clientId);
      return NextResponse.json({
        success: true,
        data: cases,
      });
    }

    if (action === "add_case") {
      const result = await addLegalCase({
        clientId,
        caseNumber: body.caseNumber,
        caseType: body.caseType,
        courtName: body.courtName,
        status: body.status || "pending",
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === "track_bounced_check") {
      const result = await trackBouncedCheck(clientId, checkNumber, amountDue);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Legal operation failed" },
      { status: 500 }
    );
  }
}
