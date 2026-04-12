import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { withAuth, type AuthRole } from "@/server/lib/auth";
import { db } from "@/server/db";
import { clientPhones, clients } from "@/server/db/schema";
import { normalizePhone } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchSort = "newest" | "oldest" | "name_asc" | "name_desc";

type CachedSearch = {
  data: SearchRow[];
  count: number;
  expiry: number;
};

type SearchRow = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  customerId: string | null;
  portfolioType: string;
  domainType: string;
  createdAt: Date;
  phones: string[];
};

const cache = new Map<string, CachedSearch>();
const TTL_MS = 1000 * 60 * 3;
const MAX_LIMIT = 50;

function getScopeCondition(userId: string, role: AuthRole) {
  if (role === "hidden_admin") return undefined;
  if (role === "admin") return eq(clients.portfolioType, "ACTIVE");
  if (role === "supervisor") return eq(clients.portfolioType, "WRITEOFF");
  if (role === "team_leader") return eq(clients.teamLeaderId, userId);
  return eq(clients.ownerId, userId);
}

function getSort(sort: SearchSort) {
  switch (sort) {
    case "oldest":
      return asc(clients.createdAt);
    case "name_asc":
      return asc(clients.name);
    case "name_desc":
      return desc(clients.name);
    case "newest":
    default:
      return desc(clients.createdAt);
  }
}

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const { searchParams } = new URL(req.url);
      const q = searchParams.get("q")?.trim() ?? "";
      const sort = (searchParams.get("sort") as SearchSort) || "newest";
      const portfolio = searchParams.get("portfolio")?.trim().toUpperCase();
      const domain = searchParams.get("domain")?.trim().toUpperCase();
      const limitRaw = Number(searchParams.get("limit") || 20);
      const limit = Number.isFinite(limitRaw)
        ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
        : 20;

      if (q.length < 2) {
        return NextResponse.json({ success: true, count: 0, data: [], message: "Type at least 2 characters" });
      }

      const cacheKey = [
        user.id,
        user.role,
        q.toLowerCase(),
        sort,
        portfolio ?? "",
        domain ?? "",
        String(limit),
      ].join(":");

      const cached = cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json({ success: true, cached: true, count: cached.count, data: cached.data });
      }

      const normalizedPhone = normalizePhone(q);
      const searchClauses = [
        ilike(clients.name, `%${q}%`),
        ilike(sql`coalesce(${clients.email}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clients.company}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clients.customerId}, '')`, `%${q}%`),
      ];

      if (normalizedPhone.length >= 3) {
        searchClauses.push(ilike(clientPhones.phone, `%${normalizedPhone}%`));
      }

      const conditions = [or(...searchClauses)];
      const scope = getScopeCondition(user.id, user.role);

      if (scope) conditions.push(scope);
      if (portfolio === "ACTIVE" || portfolio === "WRITEOFF") {
        conditions.push(eq(clients.portfolioType, portfolio));
      }
      if (["FIRST", "THIRD", "WRITEOFF"].includes(domain ?? "")) {
        conditions.push(eq(clients.domainType, domain as "FIRST" | "THIRD" | "WRITEOFF"));
      }

      const rows = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          company: clients.company,
          customerId: clients.customerId,
          portfolioType: clients.portfolioType,
          domainType: clients.domainType,
          createdAt: clients.createdAt,
          phone: clientPhones.phone,
        })
        .from(clients)
        .leftJoin(clientPhones, eq(clients.id, clientPhones.clientId))
        .where(and(...conditions))
        .orderBy(getSort(sort))
        .limit(limit * 3);

      const byClient = new Map<string, SearchRow>();
      for (const row of rows) {
        if (!byClient.has(row.id)) {
          byClient.set(row.id, {
            id: row.id,
            name: row.name,
            email: row.email,
            company: row.company,
            customerId: row.customerId,
            portfolioType: row.portfolioType,
            domainType: row.domainType,
            createdAt: row.createdAt,
            phones: [],
          });
        }

        if (row.phone) {
          const item = byClient.get(row.id);
          if (item && !item.phones.includes(row.phone)) {
            item.phones.push(row.phone);
          }
        }
      }

      const data = Array.from(byClient.values()).slice(0, limit);
      const response = { success: true, count: data.length, data, empty: data.length === 0 };

      cache.set(cacheKey, { data, count: data.length, expiry: Date.now() + TTL_MS });
      return NextResponse.json(response);
    } catch (error) {
      console.error("SEARCH ERROR:", error);
      return NextResponse.json({ success: false, error: "Search failed" }, { status: 500 });
    }
  });
}
