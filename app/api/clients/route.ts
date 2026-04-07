import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, clientLoans, osintResults } from "@/server/db/schema";
import { desc } from "drizzle-orm";

import { withApiGuard } from "@/server/lib/auth";
import { logAction } from "@/server/services/log.service";
import { auditSensitiveAction } from "@/server/services/audit.service";
import { getPagination } from "@/lib/pagination";
import { getOwnershipScopeCondition } from "@/server/services/client.service";

const rateMap = new Map<string, { count: number; time: number }>();
function rateLimit(key: string, limit = 30) {
  const now = Date.now();
  const data = rateMap.get(key) || { count: 0, time: now };
  if (now - data.time > 60000) {
    data.count = 0;
    data.time = now;
  }
  data.count++;
  rateMap.set(key, data);
  if (data.count > limit) throw new Error("Too many requests");
}

const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 30;

function success(data: any, meta?: any) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) });
}
function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function GET(req: NextRequest) {
  return withApiGuard(req, { method: "GET", route: "/api/clients" }, async (user) => {
    if (!user) return fail("Unauthorized", 401);

    try {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      rateLimit(ip);

      const { page, limit, offset } = getPagination(req);
      const ownershipScope = getOwnershipScopeCondition(user.id, user.role);
      const cacheKey = `${user.id}-${user.role}-${page}-${limit}`;

      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return success(cached.data, { page, limit, cached: true });
      }

      const data = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          company: clients.company,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(ownershipScope)
        .orderBy(desc(clients.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = data.length > limit;
      if (hasMore) data.pop();

      await logAction(user.id, "GET_CLIENTS", { page, limit });
      await auditSensitiveAction(user.id, "CLIENT_VIEW_LIST", { page, limit, role: user.role });

      cache.set(cacheKey, { data, expiry: Date.now() + TTL });

      return success(data, { page, limit, count: data.length, hasMore });
    } catch (error: any) {
      return fail(error?.message || "Unauthorized", error?.message === "Too many requests" ? 429 : 401);
    }
  });
}

export async function POST(req: NextRequest) {
  return withApiGuard(req, { method: "POST", route: "/api/clients" }, async (user) => {
    if (!user) return fail("Unauthorized", 401);

    try {
      const body = await req.json();
      const { name, email, company, phones, addresses, loans, imageUrl, osintData } = body;

      if (!name) return fail("Name is required");
      if (!phones || phones.length === 0) return fail("At least one phone is required");
      if (!loans || loans.length === 0) return fail("At least one loan is required");

      const clientResult = await db.insert(clients).values({
        name,
        email: email || null,
        company: company || null,
        imageUrl: imageUrl || null,
        ownerId: user.role === "collector" ? user.id : body.ownerId || user.id,
      }).returning();

      const clientId = clientResult[0].id;

      if (phones?.length > 0) {
        await db.insert(clientPhones).values(phones.map((phone: string) => ({ clientId, phone })));
      }
      if (addresses?.length > 0) {
        await db.insert(clientAddresses).values(
          addresses.map((address: any, index: number) => ({
            clientId,
            address: address.address || address,
            city: address.city,
            area: address.area,
            lat: address.lat?.toString(),
            lng: address.lng?.toString(),
            isPrimary: index === 0,
          }))
        );
      }
      if (loans?.length > 0) {
        await db.insert(clientLoans).values(
          loans.map((loan: any) => ({
            clientId,
            loanType: loan.loanType,
            balance: loan.balance?.toString(),
            overdue: loan.overdue?.toString(),
            emi: loan.emi?.toString(),
            amountDue: loan.amountDue?.toString(),
            bucket: loan.bucket || 1,
            penaltyEnabled: loan.penaltyEnabled || false,
            penaltyAmount: loan.penaltyAmount?.toString() || "0",
          }))
        );
      }
      if (osintData) {
        await db.insert(osintResults).values({
          clientId,
          social: osintData.socialLinks || [],
          workplace: osintData.workplace || [],
          webResults: osintData.webResults || [],
          imageResults: osintData.imageMatches || [],
          summary: osintData.summary,
          confidenceScore: osintData.confidence || 0,
        });
      }

      await logAction(user.id, "CREATE_CLIENT", { clientId, name });
      await auditSensitiveAction(user.id, "CLIENT_MODIFY_CREATE", { clientId, name });

      return success({ id: clientId, name });
    } catch (error: any) {
      return fail(error?.message || "Failed to create client", 500);
    }
  });
}
