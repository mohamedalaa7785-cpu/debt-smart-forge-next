import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { getRecommendation } from "@/server/services/recommendation.service";
import { analyzeFraud } from "@/server/services/fraud.service";
import { ClientIdBodySchema } from "@/lib/validators/api";
import { ForbiddenError, ValidationError, handleApiError } from "@/server/core/error.handler";
import { cacheGet, cacheSet, enforceRateLimit } from "@/server/core/distributed-cache";

const CACHE_TTL_SECONDS = 60 * 5;

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
      await enforceRateLimit(`recommendation:${user.id}`, 30, 60);
      const client = await getClientById(clientId, user.id, user.role);

      if (!client) {
        throw new ForbiddenError();
      }

      const cacheKey = `${user.id}:${clientId}`;
      const cached = await cacheGet<unknown>(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          meta: { cached: true },
        });
      }

      const [fraud, recommendation] = await Promise.all([
        analyzeFraud({
          clientId,
          phones: client.phones?.map((p) => p.phone),
          loans: client.loans,
          osint: client.osint,
        }),

        getRecommendation({
          osint: client.osint,
          loans: client.loans,
        }),
      ]);

      let priority = "low";
      if (fraud.level === "critical") priority = "urgent";
      else if (fraud.level === "high") priority = "high";
      else if (fraud.level === "medium") priority = "medium";

      const response = {
        action: recommendation.action,
        reason: recommendation.reason,
        priority,
        fraud: {
          score: fraud.score,
          level: fraud.level,
          signals: fraud.signals,
        },
      };

      await cacheSet(cacheKey, response, CACHE_TTL_SECONDS);

      return NextResponse.json({
        success: true,
        data: response,
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
