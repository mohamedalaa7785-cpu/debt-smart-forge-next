import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { analyzeFraud } from "@/server/services/fraud.service";
import { ClientIdBodySchema } from "@/lib/validators/api";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const body = await req.json();
      const parsed = ClientIdBodySchema.safeParse(body);

      if (!parsed.success) {
        throw new ValidationError("clientId required", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const { clientId } = parsed.data;
      const client = await getClientById(clientId, user.id, user.role);

      if (!client) {
        throw new ForbiddenError();
      }

      const result = await analyzeFraud({
        clientId,
        phones: client.phones?.map((p) => p.phone),
        loans: client.loans,
        osint: client.osint,
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
