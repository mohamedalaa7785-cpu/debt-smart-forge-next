import { db } from "@/server/db";
import {
  clients,
  clientPhones,
  clientAddresses,
  clientLoans,
  clientActions,
  osintResults,
  callLogs,
  followups,
} from "@/server/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

/* =========================
   HELPERS
========================= */

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

function dedupePhones(phones: string[]) {
  return Array.from(new Set(phones.map(normalizePhone)));
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
  return isNaN(num) ? 0 : num;
}

/* =========================
   ACCESS CONTROL 🔐 (IMPROVED)
========================= */

export function canAccessClient(
  client: any,
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
    return (
      client.teamLeaderId === userId ||
      client.ownerId === userId
    );
  }

  return client.ownerId === userId;
}

/* =========================
   BULK HELPERS 🔥
========================= */

export async function bulkDeleteClients(ids: string[]) {
  if (!ids.length) return;

  await db.delete(clients).where(inArray(clients.id, ids));
}

export async function assignClients(ids: string[], userId: string) {
  if (!ids.length) return;

  await db
    .update(clients)
    .set({ ownerId: userId })
    .where(inArray(clients.id, ids));
}

/* =========================
   CREATE CLIENT 🔥
========================= */

export async function createClientFull(data: any, creatorId: string) {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!Array.isArray(data.phones) || data.phones.length === 0)
    throw new Error("Phones required");
  if (!Array.isArray(data.loans) || data.loans.length === 0)
    throw new Error("Loans required");

  return db.transaction(async (tx) => {
    const ownerId = data.ownerId || creatorId;

    const phones = dedupePhones(data.phones);
    const addresses = data.addresses
      ? dedupeAddresses(data.addresses)
      : [];

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
        createdBy: creatorId,
        cycleStartDate:
          data.cycleStartDate || new Date().toISOString(),
        cycleEndDate: data.cycleEndDate || null,
      })
      .returning();

    /* PHONES */
    if (phones.length) {
      await tx.insert(clientPhones).values(
        phones.map((p) => ({
          clientId: client.id,
          phone: p,
        }))
      );
    }

    /* ADDRESSES */
    if (addresses.length) {
      await tx.insert(clientAddresses).values(
        addresses.map((a) => ({
          clientId: client.id,
          address: a.address || null,
          city: a.city || null,
          area: a.area || null,
          lat: a.lat ? String(a.lat) : null,
          lng: a.lng ? String(a.lng) : null,
          isPrimary: Boolean(a.isPrimary),
        }))
      );
    }

    /* LOANS */
    await tx.insert(clientLoans).values(
      data.loans.map((l: any) => ({
        clientId: client.id,
        loanType: l.loanType || "UNKNOWN",
        emi: toSafeNumber(l.emi),
        balance: toSafeNumber(l.balance),
        overdue: toSafeNumber(l.overdue),
        amountDue: toSafeNumber(l.amountDue ?? l.overdue),
        bucket: Number(l.bucket || 1),
        penaltyEnabled: Boolean(l.penaltyEnabled),
        penaltyAmount: toSafeNumber(l.penaltyAmount),
      }))
    );

    return client;
  });
}

/* =========================
   GET CLIENTS
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

export async function getClientById(
  id: string,
  userId?: string,
  role?: string
) {
  try {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id),
    });

    if (!client) return null;

    if (userId && role && !canAccessClient(client, userId, role)) {
      throw new Error("Forbidden");
    }

    const [
      phones,
      addresses,
      loans,
      actions,
      osint,
      calls,
      followupsData,
    ] = await Promise.all([
      db.select().from(clientPhones).where(eq(clientPhones.clientId, id)),
      db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)),
      db.select().from(clientLoans).where(eq(clientLoans.clientId, id)),

      db
        .select()
        .from(clientActions)
        .where(eq(clientActions.clientId, id))
        .orderBy(desc(clientActions.createdAt)),

      db
        .select()
        .from(osintResults)
        .where(eq(osintResults.clientId, id))
        .limit(1)
        .then((res) => res[0] ?? null),

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
      actions,
      osint,
      calls,
      followups: followupsData,
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return null;
  }
        }
