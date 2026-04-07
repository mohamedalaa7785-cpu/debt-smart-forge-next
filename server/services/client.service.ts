// file: server/services/client.service.ts

import { db } from "@/server/db";
import {
  clients,
  clientPhones,
  clientAddresses,
  clientLoans,
  callLogs,
  followups,
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

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

function dedupeAddresses(addresses: any[]) {
  const map = new Map();
  for (const addr of addresses) {
    const key = `${addr.address}-${addr.city}-${addr.area}`;
    if (!map.has(key)) map.set(key, addr);
  }
  return Array.from(map.values());
}

function toSafeNumber(val: any) {
  const num = Number(val);
  return isNaN(num) ? "0" : num.toString();
}

/* =========================
   ACCESS CONTROL 🔐
========================= */
export function canAccessClient(
  client: {
    ownerId: string | null;
    teamLeaderId: string | null;
    portfolioType: string | null;
  } | null,
  userId: string,
  role: string
) {
  if (!client) return false;

  if (role === "hidden_admin") return true;

  if (role === "admin") {
    return client.portfolioType === "ACTIVE";
  }

  if (role === "supervisor") {
    return client.portfolioType === "WRITEOFF";
  }

  if (role === "team_leader") {
    return client.teamLeaderId === userId;
  }

  return client.ownerId === userId;
}

/* =========================
   CREATE CLIENT 🔥🔥🔥
========================= */
export async function createClientFull(data: any, creatorId: string) {
  if (!data.name) throw new Error("Name is required");
  if (!data.phones?.length) throw new Error("Phones required");
  if (!data.loans?.length) throw new Error("Loans required");

  return await db.transaction(async (tx) => {
    const ownerId = data.ownerId || creatorId;

    const phones = dedupePhones(data.phones);
    const addresses = data.addresses ? dedupeAddresses(data.addresses) : [];

    const [client] = await tx
      .insert(clients)
      .values({
        name: data.name.trim(),
        customerId: data.customerId || null,
        email: data.email || null,
        company: data.company || null,
        notes: data.notes || null,
        ownerId,
        teamLeaderId: data.teamLeaderId || null,
        portfolioType: data.portfolioType || "ACTIVE",
        domainType: data.domainType || "FIRST",
        branch: data.branch || null,
        cycleStartDate:
          data.cycleStartDate || new Date().toISOString().split("T")[0],
        cycleEndDate: data.cycleEndDate || null,
      })
      .returning();

    /* PHONES */
    await tx.insert(clientPhones).values(
      phones.map((p) => ({
        clientId: client.id,
        phone: p,
      }))
    );

    /* ADDRESSES */
    if (addresses.length) {
      await tx.insert(clientAddresses).values(
        addresses.map((a) => ({
          clientId: client.id,
          address: a.address,
          city: a.city,
          area: a.area,
          lat: a.lat?.toString() || null,
          lng: a.lng?.toString() || null,
          isPrimary: a.isPrimary || false,
        }))
      );
    }

    /* LOANS */
    await tx.insert(clientLoans).values(
      data.loans.map((l: any) => ({
        clientId: client.id,
        loanType: l.loanType,
        emi: toSafeNumber(l.emi),
        balance: toSafeNumber(l.balance),
        overdue: toSafeNumber(l.overdue),
        amountDue: toSafeNumber(l.amountDue || l.overdue),
        bucket: l.bucket || 1,
        penaltyEnabled: l.penaltyEnabled || false,
        penaltyAmount: toSafeNumber(l.penaltyAmount),
      }))
    );

    return client;
  });
}

/* =========================
   GET CLIENTS 👥
========================= */
export async function getClientsForUser(userId: string, role: string) {
  if (role === "hidden_admin") {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  if (role === "admin") {
    return db
      .select()
      .from(clients)
      .where(eq(clients.portfolioType, "ACTIVE"))
      .orderBy(desc(clients.createdAt));
  }

  if (role === "supervisor") {
    return db
      .select()
      .from(clients)
      .where(eq(clients.portfolioType, "WRITEOFF"))
      .orderBy(desc(clients.createdAt));
  }

  if (role === "team_leader") {
    return db
      .select()
      .from(clients)
      .where(eq(clients.teamLeaderId, userId))
      .orderBy(desc(clients.createdAt));
  }

  return db
    .select()
    .from(clients)
    .where(eq(clients.ownerId, userId))
    .orderBy(desc(clients.createdAt));
}

/* =========================
   GET CLIENT FULL 🔥
========================= */
export async function getClientById(id: string) {
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, id),
  });

  if (!client) return null;

  const [phones, addresses, loans, calls, followupsData] =
    await Promise.all([
      db.select().from(clientPhones).where(eq(clientPhones.clientId, id)),
      db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)),
      db.select().from(clientLoans).where(eq(clientLoans.clientId, id)),
      db
        .select()
        .from(callLogs)
        .where(eq(callLogs.clientId, id))
        .orderBy(desc(callLogs.createdAt)),
      db
        .select()
        .from(followups)
        .where(eq(followups.clientId, id))
        .orderBy(desc(followups.scheduledFor)),
    ]);

  return {
    ...client,
    phones,
    addresses,
    loans,
    calls,
    followups: followupsData,
  };
      }
