import { NextRequest, NextResponse } from "next/server";
import { generateLegalNotice, getLegalCases, addLegalCase, trackBouncedCheck } from "@/server/services/legal.service";
import { withApiGuard } from "@/server/lib/auth";
import { auditSensitiveAction } from "@/server/services/audit.service";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const action = body?.action;

  return withApiGuard(req, { method: "POST", route: "/api/legal", action }, async (user) => {
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
      const { clientId, clientName, amountDue, bankName, date, checkNumber } = body;

      if (action === "generate_inzar") {
        const notice = await generateLegalNotice({ clientName, amountDue, bankName, date });
        await auditSensitiveAction(user.id, "LEGAL_DECISION_NOTICE", { clientId, clientName });
        return NextResponse.json({ success: true, data: { notice } });
      }

      if (action === "get_cases") {
        const cases = await getLegalCases(clientId);
        return NextResponse.json({ success: true, data: cases });
      }

      if (action === "add_case") {
        const result = await addLegalCase({
          clientId,
          caseNumber: body.caseNumber,
          caseType: body.caseType,
          courtName: body.courtName,
          status: body.status || "pending",
        });
        await auditSensitiveAction(user.id, "LEGAL_DECISION_ADD_CASE", { clientId, caseNumber: body.caseNumber });
        return NextResponse.json({ success: true, data: result });
      }

      if (action === "track_bounced_check") {
        const result = await trackBouncedCheck(clientId, checkNumber, amountDue);
        await auditSensitiveAction(user.id, "LEGAL_DECISION_BOUNCED_CHECK", { clientId, checkNumber });
        return NextResponse.json({ success: true, data: result });
      }

      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error?.message || "Legal operation failed" }, { status: 500 });
    }
  });
}
