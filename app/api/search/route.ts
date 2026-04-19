import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { withAuth, type AuthRole } from "@/server/lib/auth";
import { db } from "@/server/db";
import {
  clientActions,
  clientAddresses,
  clientLoans,
  clientPhones,
  clients,
} from "@/server/db/schema";
import { normalizePhone } from "@/lib/utils";
import { SearchQuerySchema, type SearchQuery } from "@/lib/validators/search";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { getRequestIp } from "@/server/lib/request";
import { handleApiError } from "@/server/core/error.handler";

export const dynamic = "force-dynamic";

type SearchSort = SearchQuery["sort"];

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
  phones: string[] | null;
};

const cache = new Map<string, CachedSearch>();
const TTL_MS = 1000 * 60 * 3;
const MAX_CACHE_ENTRIES = 250;

function getScopeCondition(userId: string, role: AuthRole) {
  if (role === "hidden_admin") return undefined;
  if (role === "admin") return eq(clients.portfolioType, "ACTIVE");
  if (role === "supervisor") return eq(clients.portfolioType, "WRITEOFF");
  if (role === "team_leader") return eq(clients.teamLeaderId, userId);
  return eq(clients.ownerId, userId);
}


function pruneCache() {
  if (cache.size < MAX_CACHE_ENTRIES) return;

  const now = Date.now();
  for (const [key, item] of cache.entries()) {
    if (item.expiry <= now) cache.delete(key);
  }

  if (cache.size < MAX_CACHE_ENTRIES) return;

  const sorted = [...cache.entries()].sort((a, b) => a[1].expiry - b[1].expiry);
  for (const [key] of sorted.slice(0, cache.size - MAX_CACHE_ENTRIES + 1)) {
    cache.delete(key);
  }
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
      const ip = getRequestIp(req);
      await enforceRateLimit(`search:${user.id}:${ip}`, 45, 60);

      const { searchParams } = new URL(req.url);
      const parsed = SearchQuerySchema.safeParse({
        q: searchParams.get("q") ?? "",
        sort: searchParams.get("sort") ?? "newest",
        portfolio: searchParams.get("portfolio") ?? undefined,
        domain: searchParams.get("domain") ?? undefined,
        limit: searchParams.get("limit") ?? 20,
      });

      if (!parsed.success) {
        return NextResponse.json({ success: true, count: 0, data: [], message: "Type at least 2 characters" });
      }
      const { q, sort, portfolio, domain, limit } = parsed.data;

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
        ilike(sql`coalesce(${clients.notes}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clients.referral}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clients.branch}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientAddresses.address}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientAddresses.city}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientAddresses.area}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientLoans.loanNumber}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientActions.note}, '')`, `%${q}%`),
        ilike(sql`coalesce(${clientActions.result}, '')`, `%${q}%`),
      ];

      if (normalizedPhone.length >= 3) {
        searchClauses.push(ilike(clientPhones.phone, `%${normalizedPhone}%`));
      }

      const conditions = [or(...searchClauses)];
      const scope = getScopeCondition(user.id, user.role);

      if (scope) conditions.push(scope);
      if (portfolio) {
        conditions.push(eq(clients.portfolioType, portfolio));
      }
      if (domain) {
        conditions.push(eq(clients.domainType, domain));
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
          phones: sql<string[]>`array_remove(array_agg(distinct ${clientPhones.phone}), null)`,
        })
        .from(clients)
        .leftJoin(clientPhones, eq(clients.id, clientPhones.clientId))
        .leftJoin(clientAddresses, eq(clients.id, clientAddresses.clientId))
        .leftJoin(clientLoans, eq(clients.id, clientLoans.clientId))
        .leftJoin(clientActions, eq(clients.id, clientActions.clientId))
        .where(and(...conditions))
        .groupBy(
          clients.id,
          clients.name,
          clients.email,
          clients.company,
          clients.customerId,
          clients.portfolioType,
          clients.domainType,
          clients.createdAt
        )
        .orderBy(getSort(sort))
        .limit(limit);

      const data = rows.map((row) => ({
        ...row,
        phones: row.phones ?? [],
      }));
      const response = { success: true, count: data.length, data, empty: data.length === 0 };

      pruneCache();
      cache.set(cacheKey, { data, count: data.length, expiry: Date.now() + TTL_MS });
      return NextResponse.json(response);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
