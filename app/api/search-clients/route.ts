import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getRequestIp } from "@/server/lib/request";
import { enforceRateLimit, cacheGet, cacheSet } from "@/server/core/distributed-cache";
import { db } from "@/server/db";
import { clientPhones, clients } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";
import { handleApiError } from "@/server/core/error.handler";

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = getRequestIp(req);
      await enforceRateLimit(`search-clients:${user.id}:${ip}`, 40, 60);

      const q = (req.nextUrl.searchParams.get("q") || "").trim();
      const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get("limit") || 20), 1), 50);
      if (q.length < 2) return NextResponse.json({ success: true, count: 0, data: [] });

      const normalized = normalizePhone(q);
      const cacheKey = `search-clients:${user.id}:${q}:${limit}`;
      const cached = await cacheGet<Array<Record<string, unknown>>>(cacheKey);
      if (cached) return NextResponse.json({ success: true, cached: true, count: cached.length, data: cached });

      const scopeCondition =
        user.role === "hidden_admin" || user.role === "admin"
          ? sql`true`
          : eq(clients.ownerId, user.id);

      const rows = await db
        .select({
          id: clients.id,
          name: clients.name,
          phone: clientPhones.phone,
          rank: sql<number>`greatest(similarity(${clients.name}, ${q}), similarity(coalesce(${clientPhones.phone}, ''), ${normalized || q}))`,
        })
        .from(clients)
        .leftJoin(clientPhones, eq(clients.id, clientPhones.clientId))
        .where(sql`${scopeCondition} and (
            ${clients.name} % ${q}
            or ${clients.name} ilike ${`%${q}%`}
            or coalesce(${clientPhones.phone}, '') ilike ${`%${normalized || q}%`}
          )`)
        .orderBy(sql`greatest(similarity(${clients.name}, ${q}), similarity(coalesce(${clientPhones.phone}, ''), ${normalized || q})) desc`)
        .limit(limit);

      const data = rows.map((r) => ({
        ...r,
        rank: Number(r.rank || 0),
      }));

      await cacheSet(cacheKey, data, 120);

      return NextResponse.json({ success: true, count: data.length, data });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
