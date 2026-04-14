export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { osintHistory } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { OsintHistoryQuerySchema } from "@/lib/validators/api";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const parsed = OsintHistoryQuerySchema.safeParse({
        clientId: searchParams.get("clientId"),
        limit: searchParams.get("limit") ?? 10,
      });

      if (!parsed.success) {
        throw new ValidationError("Invalid osint history query", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const { clientId, limit } = parsed.data;
      const client = await getClientById(clientId, user.id, user.role);
      if (!client) {
        throw new ForbiddenError();
      }

      const history = await db
        .select()
        .from(osintHistory)
        .where(eq(osintHistory.clientId, clientId))
        .orderBy(desc(osintHistory.createdAt))
        .limit(limit);

      return NextResponse.json({ success: true, data: history });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
