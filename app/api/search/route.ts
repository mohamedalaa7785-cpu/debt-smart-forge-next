import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clients, clientPhones } from "@/server/db/schema";
import { ilike, or, desc, eq, and, inArray } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";
import { getClientsForUser } from "@/server/services/client.service";

export const dynamic = "force-dynamic";

const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 60 * 3;

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const rawQuery = searchParams.get("q");

      if (!rawQuery || rawQuery.trim().length < 2) {
        return NextResponse.json({ success: true, count: 0, data: [] });
      }

      const q = rawQuery.trim().slice(0, 100);
      const phone = normalizePhone(q);

      const scopedClients = await getClientsForUser(user.id, user.role);
      const scopedClientIds = scopedClients.map((c: any) => c.id);

      if (!scopedClientIds.length) {
        return NextResponse.json({ success: true, count: 0, data: [] });
      }

      const cacheKey = `${user.id}:${user.role}:${q.toLowerCase()}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json({ success: true, cached: true, count: cached.data.length, data: cached.data });
      }

      const conditions = [ilike(clients.name, `%${q}%`)];
      if (clients.email) conditions.push(ilike(clients.email, `%${q}%`));
      if (clients.company) conditions.push(ilike(clients.company, `%${q}%`));
      if (phone && phone.length >= 3) conditions.push(ilike(clientPhones.phone, `%${phone}%`));

      const results = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          company: clients.company,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .leftJoin(clientPhones, eq(clients.id, clientPhones.clientId))
        .where(and(inArray(clients.id, scopedClientIds), or(...conditions)))
        .orderBy(desc(clients.createdAt))
        .limit(20);

      // Deduplicate results (since join might return multiple rows per client)
      const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

      cache.set(cacheKey, { data: uniqueResults, expiry: Date.now() + TTL });

      return NextResponse.json({
        success: true,
        count: uniqueResults.length,
        data: uniqueResults,
      });
    } catch (error: any) {
      console.error("SEARCH ERROR:", error);
      return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
    }
  });
}
