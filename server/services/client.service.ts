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
import { calculateFinancials } from "@/server/services/financial.service";

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

function normalizeDueDay(cycle: any) {
  const dueDay = Number(cycle);
  if (isNaN(dueDay)) return null;
  return Math.min(31, Math.max(1, Math.floor(dueDay)));
}

type ClientRow = typeof clients.$inferSelect;
type ClientBundle = ClientRow & {
  phones: Array<typeof clientPhones.$inferSelect>;
  addresses: Array<typeof clientAddresses.$inferSelect>;
  loans: Array<typeof clientLoans.$inferSelect>;
  actions: Array<typeof clientActions.$inferSelect>;
  osint: typeof osintResults.$inferSelect | null;
  calls: Array<typeof callLogs.$inferSelect>;
  followups: Array<typeof followups.$inferSelect>;
};

export function canAccessClient(client: ClientRow, userId: string, role: string) {
  if (!client) return false;
  if (role === "hidden_admin") return true;

  if (role === "admin") {
    return client.portfolioType === "ACTIVE";
  }

  if (role === "supervisor") {
    return client.portfolioType === "WRITEOFF";
  }

  if (role === "team_leader") {
    return client.teamLeaderId === userId || client.ownerId === userId;
  }

  return client.ownerId === userId;
}

export async function bulkDeleteClients(ids: string[]) {
  if (!ids.length) return;
  await db.delete(clients).where(inArray(clients.id, ids));
}

export async function assignClients(ids: string[], userId: string) {
  if (!ids.length) return;
  await db.update(clients).set({ ownerId: userId }).where(inArray(clients.id, ids));
}

export async function createClientFull(data: any, creatorId: string) {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!Array.isArray(data.phones) || data.phones.length === 0) throw new Error("Phones required");
  if (!Array.isArray(data.loans) || data.loans.length === 0) throw new Error("Loans required");

  return db.transaction(async (tx) => {
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
        referral: data.referral || null,
        ownerId,
        teamLeaderId: data.teamLeaderId || null,
        portfolioType: data.portfolioType || "ACTIVE",
        domainType: data.domainType || "FIRST",
        branch: data.branch || null,
        createdBy: creatorId,
        cycleStartDate: data.cycleStartDate || new Date().toISOString(),
        cycleEndDate: data.cycleEndDate || null,
      })
      .returning();

    if (phones.length) {
      await tx.insert(clientPhones).values(
        phones.map((p) => ({
          clientId: client.id,
          phone: p,
        }))
      );
    }

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

    await tx.insert(clientLoans).values(
      data.loans.map((l: any) => {
        const loanType = l.loanType || "UNKNOWN";
        const baseEmi = toSafeNumber(l.emi);
        const bucket = Math.max(1, Number(l.bucket || 1));
        const organization = l.organization || null;

        const isPersonalOrCompanyLoan = String(loanType).toUpperCase() === "PIL" || Boolean(organization);

        const financial = calculateFinancials({
          loanType,
          emi: baseEmi,
          bucket,
          penaltyEnabled: Boolean(l.penaltyEnabled) || isPersonalOrCompanyLoan,
          penaltyAmount: toSafeNumber(l.penaltyAmount),
        });

        const adjustedEmi =
          isPersonalOrCompanyLoan && bucket > 1 ? Number((financial.amountDue / bucket).toFixed(2)) : baseEmi;

        return {
          clientId: client.id,
          loanType,
          loanNumber: l.loanNumber || null,
          cycle: normalizeDueDay(l.cycle),
          organization,
          willLegal: Boolean(l.willLegal),
          referralDate: l.referralDate ? new Date(l.referralDate) : null,
          collectorPercentage:
            l.collectorPercentage !== undefined && l.collectorPercentage !== null && l.collectorPercentage !== ""
              ? toSafeNumber(l.collectorPercentage)
              : null,
          emi: adjustedEmi,
          balance: toSafeNumber(l.balance),
          overdue: financial.amountDue,
          amountDue: financial.amountDue,
          bucket,
          penaltyEnabled: financial.penaltyEnabled,
          penaltyAmount: financial.penaltyAmount,
        };
      })
    );

    return client;
  });
}

export async function getClientsForUser(userId: string, role: string) {
  if (role === "hidden_admin") {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  if (role === "admin") {
    return db.select().from(clients).where(eq(clients.portfolioType, "ACTIVE")).orderBy(desc(clients.createdAt));
  }

  if (role === "supervisor") {
    return db.select().from(clients).where(eq(clients.portfolioType, "WRITEOFF")).orderBy(desc(clients.createdAt));
  }

  if (role === "team_leader") {
    return db.select().from(clients).where(eq(clients.teamLeaderId, userId)).orderBy(desc(clients.createdAt));
  }

  return db.select().from(clients).where(eq(clients.ownerId, userId)).orderBy(desc(clients.createdAt));
}

export async function getClientBundlesByIds(
  ids: string[],
  userId: string,
  role: string
): Promise<ClientBundle[]> {
  if (!ids.length) return [];

  const baseClients = await db.select().from(clients).where(inArray(clients.id, ids));
  const scopedClients = baseClients.filter((client) => canAccessClient(client, userId, role));

  if (!scopedClients.length) return [];

  const scopedIds = scopedClients.map((client) => client.id);

  const [phones, addresses, loans, actions, osint, calls, followupsData] = await Promise.all([
    db.select().from(clientPhones).where(inArray(clientPhones.clientId, scopedIds)),
    db.select().from(clientAddresses).where(inArray(clientAddresses.clientId, scopedIds)),
    db.select().from(clientLoans).where(inArray(clientLoans.clientId, scopedIds)),
    db.select().from(clientActions).where(inArray(clientActions.clientId, scopedIds)).orderBy(desc(clientActions.createdAt)),
    db.select().from(osintResults).where(inArray(osintResults.clientId, scopedIds)),
    db.select().from(callLogs).where(inArray(callLogs.clientId, scopedIds)).orderBy(desc(callLogs.createdAt)),
    db.select().from(followups).where(inArray(followups.clientId, scopedIds)).orderBy(desc(followups.scheduledFor)),
  ]);

  const byClient = <T extends { clientId: string | null }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      if (!row.clientId) continue;
      if (!map.has(row.clientId)) map.set(row.clientId, []);
      map.get(row.clientId)!.push(row);
    }
    return map;
  };

  const phonesMap = byClient(phones);
  const addressesMap = byClient(addresses);
  const loansMap = byClient(loans);
  const actionsMap = byClient(actions);
  const callsMap = byClient(calls);
  const followupsMap = byClient(followupsData);
  const osintMap = new Map(osint.map((row) => [row.clientId, row]));

  return scopedClients.map((client) => ({
    ...client,
    phones: phonesMap.get(client.id) || [],
    addresses: addressesMap.get(client.id) || [],
    loans: loansMap.get(client.id) || [],
    actions: actionsMap.get(client.id) || [],
    osint: osintMap.get(client.id) || null,
    calls: callsMap.get(client.id) || [],
    followups: followupsMap.get(client.id) || [],
  }));
}

export async function getClientById(id: string, userId: string, role: string): Promise<ClientBundle | null> {
  const bundles = await getClientBundlesByIds([id], userId, role);
  return bundles[0] || null;
}
