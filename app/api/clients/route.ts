import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientsForUser, createClientFull } from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";
import { ClientsListQuerySchema, CreateClientBodySchema } from "@/lib/validators/api";
import { cacheGet, cacheSet, enforceRateLimit } from "@/server/core/distributed-cache";
import { handleApiError, ValidationError } from "@/server/core/error.handler";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function dedupePhones(phones: string[]) {
  return Array.from(new Set(phones.map(normalizePhone)));
}

const CACHE_TTL_SECONDS = 30;

export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || user.id;
      await enforceRateLimit(`clients:list:${ip}`, 30, 60);

      const { page, limit, offset } = getPagination(req);
      const { searchParams } = new URL(req.url);
      const queryParsed = ClientsListQuerySchema.safeParse({ search: searchParams.get("search") ?? "" });
      const search = (queryParsed.success ? queryParsed.data.search : "").toLowerCase();

      const cacheKey = `${user.id}-${page}-${limit}-${search}`;
      const cached = await cacheGet<any[]>(cacheKey);

      if (cached) {
        return NextResponse.json({ success: true, data: cached, meta: { page, limit, cached: true } });
      }

      const scopedClients = await getClientsForUser(user.id, user.role);
      let filtered = scopedClients;

      if (search) {
        filtered = scopedClients.filter((c) => [c.name, c.email, c.company].join(" ").toLowerCase().includes(search));
      }

      const sorted = filtered.sort(
        (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
      );

      const data = sorted.slice(offset, offset + limit + 1).map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        company: client.company,
        createdAt: client.createdAt,
      }));

      const hasMore = data.length > limit;
      if (hasMore) data.pop();

      await logAction(user.id, "GET_CLIENTS", { page, limit, search });

      await cacheSet(cacheKey, data, CACHE_TTL_SECONDS);

      return NextResponse.json({
        success: true,
        data,
        meta: { page, limit, count: data.length, hasMore, search },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || user.id;
      await enforceRateLimit(`clients:create:${ip}`, 15, 60);

      const rawBody = await req.json();
      const parsed = CreateClientBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        throw new ValidationError("Invalid client payload", {
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }

      const body = parsed.data;
      if (!Array.isArray(body.phones) || body.phones.length === 0) {
        throw new ValidationError("At least one phone is required");
      }

      if (!Array.isArray(body.loans) || body.loans.length === 0) {
        throw new ValidationError("At least one loan is required");
      }

      const phones = dedupePhones(body.phones);
      const ownerId = user.role === "hidden_admin" ? body.ownerId || user.id : user.id;
      const teamLeaderId = user.role === "team_leader" ? user.id : body.teamLeaderId || null;

      const newClient = await createClientFull(
        {
          ...body,
          phones,
          ownerId,
          teamLeaderId,
        },
        user.id
      );

      await logAction(user.id, "CREATE_CLIENT", {
        clientId: newClient.id,
        name: newClient.name,
      });

      return NextResponse.json({
        success: true,
        data: {
          id: newClient.id,
          name: newClient.name,
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
