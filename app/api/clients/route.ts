import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import {
  getClientsForUser,
  createClientFull,
} from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";
codex/add-user-creation-with-password-vx3j4x
import { ClientsListQuerySchema, CreateClientBodySchema } from "@/lib/validators/api";
import { CreateClientBodySchema } from "@/lib/validators/api";

/* =========================
   RATE LIMIT
========================= */
const rateMap = new Map<string, { count: number; time: number }>();
const WINDOW = 60 * 1000;

function rateLimit(key: string, limit = 30) {
  const now = Date.now();
  const data = rateMap.get(key);

  if (!data || now - data.time > WINDOW) {
    rateMap.set(key, { count: 1, time: now });
    return;
  }

  if (data.count >= limit) {
    throw new Error("Too many requests");
  }

  data.count++;
}

/* =========================
   HELPERS
========================= */
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function dedupePhones(phones: string[]) {
  return Array.from(new Set(phones.map(normalizePhone)));
}

/* =========================
   CACHE
========================= */
const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 30;

/* =========================
   GET CLIENTS 🔥
========================= */
export async function GET(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || user.id;
      rateLimit(ip);

      const { page, limit, offset } = getPagination(req);

      /* 🔍 SEARCH */
      const { searchParams } = new URL(req.url);
      const queryParsed = ClientsListQuerySchema.safeParse({
        search: searchParams.get("search") ?? "",
      });
      const search = (queryParsed.success ? queryParsed.data.search : "").toLowerCase();

      const cacheKey = `${user.id}-${page}-${limit}-${search}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          meta: { page, limit, cached: true },
        });
      }

      const scopedClients = await getClientsForUser(user.id, user.role);

      /* 🔍 FILTER */
      let filtered = scopedClients;

      if (search) {
        filtered = scopedClients.filter((c) =>
          [c.name, c.email, c.company]
            .join(" ")
            .toLowerCase()
            .includes(search)
        );
      }

      /* 📊 SORT */
      const sorted = filtered.sort(
        (a, b) =>
          new Date(b.createdAt as any).getTime() -
          new Date(a.createdAt as any).getTime()
      );

      /* 📦 PAGINATION */
      const data = sorted
        .slice(offset, offset + limit + 1)
        .map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          company: client.company,
          createdAt: client.createdAt,
        }));

      const hasMore = data.length > limit;
      if (hasMore) data.pop();

      await logAction(user.id, "GET_CLIENTS", {
        page,
        limit,
        search,
      });

      cache.set(cacheKey, {
        data,
        expiry: Date.now() + TTL,
      });

      return NextResponse.json({
        success: true,
        data,
        meta: {
          page,
          limit,
          count: data.length,
          hasMore,
          search,
        },
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: error.message || "Internal Server Error" },
        { status: error.message === "Too many requests" ? 429 : 500 }
      );
    }
  });
}

/* =========================
   POST CLIENT
========================= */
export async function POST(req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || user.id;
      rateLimit(ip, 15);

      const rawBody = await req.json();
      const parsed = CreateClientBodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Invalid client payload" },
          { status: 400 }
        );
      }
      const body = parsed.data;
      let { name, phones, loans } = body;

      if (!Array.isArray(phones) || phones.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one phone is required" },
          { status: 400 }
        );
      }

      if (!Array.isArray(loans) || loans.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one loan is required" },
          { status: 400 }
        );
      }

      /* normalize */
      phones = dedupePhones(phones);

      /* ownership */
      const ownerId =
        user.role === "hidden_admin" && body.ownerId
          ? body.ownerId
          : user.id;

      const teamLeaderId =
        user.role === "team_leader" ? user.id : body.teamLeaderId || null;

      const newClient = await createClientFull(
        {
          ...body,
          name,
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
    } catch (error: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || "Failed to create client",
        },
        { status: 500 }
      );
    }
  });
}
