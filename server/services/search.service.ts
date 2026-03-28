import { db } from "@/server/db";
import {
  clients,
  clientPhones,
} from "@/server/db/schema";

import { ilike, or } from "drizzle-orm";
import { normalizePhone } from "@/lib/utils";

/* =========================
   SEARCH SERVICE 🔥
========================= */
export async function searchClients(query: string) {
  if (!query || query.length < 2) return [];

  const phone = normalizePhone(query);

  const result = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      company: clients.company,
    })
    .from(clients)
    .leftJoin(
      clientPhones,
      (fields, { eq }) =>
        eq(fields.clients.id, fields.clientPhones.clientId)
    )
    .where(
      or(
        ilike(clients.name, `%${query}%`),
        ilike(clients.email, `%${query}%`),
        ilike(clients.company, `%${query}%`),
        phone
          ? ilike(clientPhones.phone, `%${phone}%`)
          : undefined
      )
    )
    .limit(25);

  /* =========================
     REMOVE DUPLICATES
  ========================= */
  return Array.from(
    new Map(result.map((r) => [r.id, r])).values()
  );
          }
