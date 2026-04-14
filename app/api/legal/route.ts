import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateLegalNotice, getLegalCases, addLegalCase, trackBouncedCheck } from "@/server/services/legal.service";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

const LegalPayloadSchema = z
  .object({
    action: z.enum(["generate_inzar", "get_cases", "add_case", "track_bounced_check"]),
    clientId: z.string().uuid().optional(),
    clientName: z.string().trim().min(1).max(200).optional(),
    amountDue: z.union([z.string(), z.number()]).optional(),
    bankName: z.string().trim().max(200).optional(),
    date: z.string().trim().max(50).optional(),
    checkNumber: z.string().trim().max(120).optional(),
    caseNumber: z.string().trim().max(120).optional(),
    caseType: z.string().trim().max(120).optional(),
    courtName: z.string().trim().max(120).optional(),
    status: z.string().trim().max(50).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const rawBody = await req.json();
      const parsed = LegalPayloadSchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new ValidationError("Invalid legal payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const body = parsed.data;

      if (body.action !== "generate_inzar") {
        if (!body.clientId) {
          throw new ValidationError("clientId is required");
        }
        const client = await getClientById(body.clientId, user.id, user.role);
        if (!client) {
          throw new ForbiddenError();
        }
      }

      if (body.action === "generate_inzar") {
        if (!body.clientName || body.amountDue === undefined) {
          throw new ValidationError("clientName and amountDue are required");
        }
        const notice = await generateLegalNotice({
          clientName: body.clientName,
          amountDue: Number(body.amountDue || 0),
          bankName: body.bankName || "Debt Smart",
          date: body.date || new Date().toISOString().slice(0, 10),
        });

        return NextResponse.json({ success: true, data: { notice } });
      }

      if (body.action === "get_cases") {
        const cases = await getLegalCases(body.clientId!);
        return NextResponse.json({ success: true, data: cases });
      }

      if (body.action === "add_case") {
        const result = await addLegalCase({
          clientId: body.clientId,
          caseNumber: body.caseNumber,
          caseType: body.caseType,
          courtName: body.courtName,
          status: body.status || "pending",
        });

        return NextResponse.json({ success: true, data: result });
      }

      const result = await trackBouncedCheck(
        body.clientId!,
        body.checkNumber || "N/A",
        Number(body.amountDue || 0)
      );
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
