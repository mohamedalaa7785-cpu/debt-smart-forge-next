// file: app/api/clients/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/server/lib/auth";
import { getClientsForUser, createClientFull } from "@/server/services/client.service";
import { logAction } from "@/server/services/log.service";
import { getPagination } from "@/lib/pagination";

/* =========================
   RATE LIMIT 🔥
========================= */
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

  if (data.count > limit) {
    throw new Error("Too many requests");
  }
}

/* =========================
   HELPERS 🔥
========================= */
function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function dedupePhones(phones: string[]) {
  const set = new Set(phones.map(normalizePhone));
  return Array.from(set);
}

/* =========================
   CACHE (LIGHT)
========================= */
const cache = new Map<string, { data: any; expiry: number }>();
const TTL = 1000 * 30;

/* =========================
   GET CLIENTS 🔥
========================= */
export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const ip = req.headers.get("x-forwarded-for") || "unknown";
      rateLimit(ip);

      const { page, limit, offset } = getPagination(req);

      const cacheKey = `${user.id}-${user.role}-${page}-${limit}`;
      const cached = cache.get(cacheKey);

      if (cached && cached.expiry > Date.now()) {
        return NextResponse.json({
          success: true,
          data: cached.data,
          meta: { page, limit, cached: true },
        });
      }

      const scopedClients = await getClientsForUser(user.id, user.role);

      const sortedClients = scopedClients.sort(
        (a, b) =>
          new Date(b.createdAt as any).getTime() -
          new Date(a.createdAt as any).getTime()
      );

      const data = sortedClients
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

      await logAction(user.id, "GET_CLIENTS", { page, limit });

      cache.set(cacheKey, { data, expiry: Date.now() + TTL });

      return NextResponse.json({
        success: true,
        data,
        meta: { page, limit, count: data.length, hasMore },
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
   POST CLIENTS 🔥
========================= */
export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();

      let { name, phones, loans } = body;

      if (!name) {
        return NextResponse.json(
          { success: false, error: "Name is required" },
          { status: 400 }
        );
      }

      if (!phones || phones.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one phone is required" },
          { status: 400 }
        );
      }

      if (!loans || loans.length === 0) {
        return NextResponse.json(
          { success: false, error: "At least one loan is required" },
          { status: 400 }
        );
      }

      // 🔥 normalize + dedupe
      phones = dedupePhones(phones);

      // 🔥 enforce owner (STRICT)
      const ownerId =
        user.role === "hidden_admin" && body.ownerId
          ? body.ownerId
          : user.id;

      const teamLeaderId =
        user.role === "team_leader" ? user.id : body.teamLeaderId || null;

      const newClient = await createClientFull(
        {
          ...body,
          name: name.trim(),
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
