import { NextRequest, NextResponse } from "next/server";
import { simulateSettlement } from "@/server/services/financial.service";
import { withAuth } from "@/server/lib/auth";
import { SettlementBodySchema } from "@/lib/validators/api";
import { ValidationError, handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async () => {
    try {
      const rawBody = await req.json();

      const parsed = SettlementBodySchema.safeParse({
        originalBalance: Number(rawBody?.originalBalance),
        haircutPercentage: Number(rawBody?.haircutPercentage),
      });

      if (!parsed.success) {
        throw new ValidationError("Invalid settlement payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const result = simulateSettlement(parsed.data);
      return NextResponse.json({ success: true, data: result });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
