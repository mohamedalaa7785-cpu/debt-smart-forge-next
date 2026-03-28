import { db } from "@/server/db";
import {
  clients,
  clientPhones,
} from "@/server/db/schema";

import { ilike, or, eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

/* =========================
   SEARCH SERVICE 🔥
========================= */
export async function searchClients(query: string) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim();
  const phone = normalizePhone(cleanQuery);

  /* =========================
     QUERY BUILD
  ========================= */
  const conditions = [
    ilike(clients.name, `%${cleanQuery}%`),
    ilike(clients.email, `%${cleanQuery}%`),
    ilike(clients.company, `%${cleanQuery}%`),
  ];

  if (phone) {
    conditions.push(
      ilike(clientPhones.phone, `%${phone}%`)
    );
  }

  /* =========================
     QUERY EXECUTION
  ========================= */
  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      company: clients.company,
      phone: clientPhones.phone,
    })
    .from(clients)
    .leftJoin(
      clientPhones,
      eq(clients.id, clientPhones.clientId)
    )
    .where(or(...conditions))
    .limit(30);

  /* =========================
     CLEAN + MERGE RESULTS 🔥
  ========================= */
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      email?: string;
      company?: string;
      phones: string[];
    }
  >();

  for (const row of result) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        company: row.company,
        phones: [],
      });
    }

    if (row.phone) {
      map.get(row.id)!.phones.push(row.phone);
    }
  }

  /* =========================
     FINAL FORMAT 🔥
  ========================= */
  return Array.from(map.values()).map((c) => ({
    ...c,
    phones: Array.from(new Set(c.phones)), // remove duplicates
  }));
}
