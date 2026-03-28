import { desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import {
  clients,
  clientPhones,
  clientAddresses,
  clientLoans,
  clientActions,
  osintResults,
  clientImages,
  type Client,
  type InsertClient,
  type ClientPhone,
  type InsertClientPhone,
  type ClientAddress,
  type InsertClientAddress,
  type ClientLoan,
  type InsertClientLoan,
  type ClientAction,
  type InsertClientAction,
  type OSINTResult,
  type InsertOSINTResult,
  type ClientImage,
  type InsertClientImage,
} from "@/server/db/schema";
import {
  calculateFinancials,
  calculateClientFinancialSummary,
} from "@/server/services/financial.service";
import { calculateRisk, getPriorityRank } from "@/server/services/risk.service";
import { parseNumber, safeJsonParse } from "@/lib/utils";

export type ClientFullProfile = {
  client: Client;
  phones: ClientPhone[];
  addresses: ClientAddress[];
  loans: ClientLoan[];
  actions: ClientAction[];
  osint: OSINTResult | null;
  images: ClientImage[];
  summary: {
    totalEMI: number;
    totalAmountDue: number;
    totalPenalty: number;
    totalBalance: number;
    riskScore: number;
    riskLabel: "HIGH" | "MEDIUM" | "LOW";
    priorityRank: number;
    primaryPhone: string | null;
    primaryAddress: string | null;
    lastActionAt: string | null;
  };
};

type CreateClientFullInput = {
  name: string;
  email?: string | null;
  company?: string | null;
  notes?: string | null;
  imageUrl?: string | null;
  phones?: Array<{
    phone: string;
    isPrimary?: boolean;
  }>;
  addresses?: Array<{
    address: string;
    lat?: string | number | null;
    lng?: string | number | null;
    isPrimary?: boolean;
  }>;
  loans?: Array<{
    loanType: string;
    loanNumber?: string | null;
    balance: string | number;
    emi: string | number;
    bucket?: string | number;
    penaltyEnabled?: boolean;
    penaltyAmount?: string | number;
    amountDue?: string | number;
    isActive?: boolean;
  }>;
};

function getPrimaryPhone(phones: ClientPhone[]) {
  const primary = phones.find((p) => p.isPrimary);
  return primary?.phone ?? phones[0]?.phone ?? null;
}

function getPrimaryAddress(addresses: ClientAddress[]) {
  const primary = addresses.find((a) => a.isPrimary);
  return primary?.address ?? addresses[0]?.address ?? null;
}

function getLatestActionDate(actions: ClientAction[]) {
  const latest = actions[0]?.createdAt;
  return latest ? new Date(latest) : null;
}

function getLastActionDays(actions: ClientAction[]) {
  const latest = getLatestActionDate(actions);
  if (!latest) return 999;
  const now = Date.now();
  const diff = now - latest.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function buildLoanFinancials(loans: ClientLoan[]) {
  return loans.map((loan) => {
    const result = calculateFinancials({
      loanType: loan.loanType,
      emi: loan.emi,
      bucket: loan.bucket,
      penaltyEnabled: loan.penaltyEnabled,
      penaltyAmount: loan.penaltyAmount,
    });

    return {
      ...loan,
      calculated: result,
    };
  });
}

export async function createClient(input: CreateClientFullInput): Promise<Client> {
  const db = await getDb();

  const [client] = await db
    .insert(clients)
    .values({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      company: input.company?.trim() || null,
      notes: input.notes?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
    })
    .returning();

  if (!client) {
    throw new Error("Failed to create client");
  }

  const phones = input.phones ?? [];
  if (phones.length > 0) {
    await db.insert(clientPhones).values(
      phones.map((p, index) => ({
        clientId: client.id,
        phone: p.phone.trim(),
        isPrimary: p.isPrimary ?? index === 0,
      }))
    );
  }

  const addresses = input.addresses ?? [];
  if (addresses.length > 0) {
    await db.insert(clientAddresses).values(
      addresses.map((a, index) => ({
        clientId: client.id,
        address: a.address.trim(),
        lat: a.lat != null ? String(a.lat) : null,
        lng: a.lng != null ? String(a.lng) : null,
        isPrimary: a.isPrimary ?? index === 0,
      }))
    );
  }

  const loans = input.loans ?? [];
  if (loans.length > 0) {
    await db.insert(clientLoans).values(
      loans.map((l) => {
        const calculated = calculateFinancials({
          loanType: l.loanType,
          emi: l.emi,
          bucket: l.bucket ?? 1,
          penaltyEnabled: l.penaltyEnabled ?? false,
          penaltyAmount: l.penaltyAmount ?? 0,
        });

        return {
          clientId: client.id,
          loanType: l.loanType.trim(),
          loanNumber: l.loanNumber?.trim() || null,
          balance: String(parseNumber(l.balance)),
          emi: String(parseNumber(l.emi)),
          bucket: Math.max(1, parseNumber(l.bucket ?? 1)),
          penaltyEnabled: l.penaltyEnabled ?? false,
          penaltyAmount: String(parseNumber(l.penaltyAmount ?? 0)),
          amountDue: String(
            parseNumber(l.amountDue ?? calculated.amountDue)
          ),
          isActive: l.isActive ?? true,
        };
      })
    );
  }

  return client;
}

export async function getAllClients(): Promise<Client[]> {
  const db = await getDb();
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function searchClients(query: string): Promise<Client[]> {
  const db = await getDb();
  const q = query.trim().toLowerCase();

  if (!q) return getAllClients();

  const all = await db.select().from(clients);
  const allPhones = await db.select().from(clientPhones);
  const allAddresses = await db.select().from(clientAddresses);
  const allLoans = await db.select().from(clientLoans);

  const matchedIds = new Set<string>();

  for (const client of all) {
    const clientPhonesRows = allPhones.filter((p) => p.clientId === client.id);
    const clientAddressesRows = allAddresses.filter(
      (a) => a.clientId === client.id
    );
    const clientLoansRows = allLoans.filter((l) => l.clientId === client.id);

    const haystacks = [
      client.name,
      client.email ?? "",
      client.company ?? "",
      client.notes ?? "",
      ...clientPhonesRows.map((p) => p.phone),
      ...clientAddressesRows.map((a) => a.address),
      ...clientLoansRows.map((l) => l.loanNumber ?? ""),
      ...clientLoansRows.map((l) => l.loanType),
    ];

    const match = haystacks.some((v) => v.toLowerCase().includes(q));
    if (match) matchedIds.add(client.id);
  }

  return all.filter((client) => matchedIds.has(client.id));
}

export async function getClientById(id: string): Promise<ClientFullProfile | null> {
  const db = await getDb();

  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  if (!client) return null;

  const [phones, addresses, loans, actions, osint, images] = await Promise.all([
    db.select().from(clientPhones).where(eq(clientPhones.clientId, id)).orderBy(desc(clientPhones.createdAt)),
    db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)).orderBy(desc(clientAddresses.createdAt)),
    db.select().from(clientLoans).where(eq(clientLoans.clientId, id)).orderBy(desc(clientLoans.createdAt)),
    db.select().from(clientActions).where(eq(clientActions.clientId, id)).orderBy(desc(clientActions.createdAt)),
    db.select().from(osintResults).where(eq(osintResults.clientId, id)).orderBy(desc(osintResults.createdAt)).limit(1),
    db.select().from(clientImages).where(eq(clientImages.clientId, id)).orderBy(desc(clientImages.createdAt)),
  ]);

  const latestOsint = osint[0] ?? null;

  const normalizedLoans = buildLoanFinancials(loans);

  const financialSummary = calculateClientFinancialSummary(
    normalizedLoans.map((loan) => loan.calculated)
  );

  const lastActionDays = getLastActionDays(actions);
  const risk = calculateRisk({
    bucket: Math.max(1, normalizedLoans[0]?.bucket ?? 1),
    amountDue: financialSummary.totalAmountDue,
    hasPhone: phones.length > 0,
    hasAddress: addresses.length > 0,
    hasLoans: loans.length > 0,
    hasOsint: Boolean(latestOsint),
    lastActionDays,
    aiSignalsScore: latestOsint?.confidenceScore ?? 0,
  });

  const priorityRank = getPriorityRank({
    amountDue: financialSummary.totalAmountDue,
    riskScore: risk.score,
    lastActionDays,
  });

  return {
    client,
    phones,
    addresses,
    loans,
    actions,
    osint: latestOsint,
    images,
    summary: {
      totalEMI: financialSummary.totalEMI,
      totalAmountDue: financialSummary.totalAmountDue,
      totalPenalty: financialSummary.totalPenalty,
      totalBalance: financialSummary.totalBalance,
      riskScore: risk.score,
      riskLabel: risk.label,
      priorityRank,
      primaryPhone: getPrimaryPhone(phones),
      primaryAddress: getPrimaryAddress(addresses),
      lastActionAt: getLatestActionDate(actions)?.toISOString() ?? null,
    },
  };
}

export async function getPrioritizedClients() {
  const db = await getDb();

  const allClients = await db.select().from(clients);
  const results = await Promise.all(
    allClients.map(async (client) => {
      const profile = await getClientById(client.id);
      return profile;
    })
  );

  return results
    .filter((item): item is ClientFullProfile => Boolean(item))
    .sort((a, b) => b.summary.priorityRank - a.summary.priorityRank);
}

export async function updateClient(
  id: string,
  input: Partial<Pick<CreateClientFullInput, "name" | "email" | "company" | "notes" | "imageUrl">>
): Promise<Client | null> {
  const db = await getDb();

  const [updated] = await db
    .update(clients)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.company !== undefined ? { company: input.company?.trim() || null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl?.trim() || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, id))
    .returning();

  return updated ?? null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const db = await getDb();
  const deleted = await db.delete(clients).where(eq(clients.id, id)).returning();
  return deleted.length > 0;
}

export async function addPhone(data: InsertClientPhone): Promise<ClientPhone> {
  const db = await getDb();
  const [row] = await db.insert(clientPhones).values(data).returning();
  if (!row) throw new Error("Failed to add phone");
  return row;
}

export async function addAddress(
  data: InsertClientAddress
): Promise<ClientAddress> {
  const db = await getDb();
  const [row] = await db.insert(clientAddresses).values(data).returning();
  if (!row) throw new Error("Failed to add address");
  return row;
}

export async function addLoan(data: InsertClientLoan): Promise<ClientLoan> {
  const db = await getDb();
  const [row] = await db.insert(clientLoans).values(data).returning();
  if (!row) throw new Error("Failed to add loan");
  return row;
}

export async function addAction(data: InsertClientAction): Promise<ClientAction> {
  const db = await getDb();
  const [row] = await db.insert(clientActions).values(data).returning();
  if (!row) throw new Error("Failed to add action");
  return row;
}

export async function saveOsintResult(
  data: InsertOSINTResult
): Promise<OSINTResult> {
  const db = await getDb();

  const existing = await db
    .select()
    .from(osintResults)
    .where(eq(osintResults.clientId, data.clientId))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(osintResults)
      .set({
        socialLinks: data.socialLinks,
        workplace: data.workplace,
        webResults: data.webResults,
        imageResults: data.imageResults,
        summary: data.summary,
        confidenceScore: data.confidenceScore,
        updatedAt: new Date(),
      })
      .where(eq(osintResults.clientId, data.clientId))
      .returning();

    if (!updated) throw new Error("Failed to update OSINT result");
    return updated;
  }

  const [row] = await db.insert(osintResults).values(data).returning();
  if (!row) throw new Error("Failed to save OSINT result");
  return row;
}

export async function addClientImage(
  data: InsertClientImage
): Promise<ClientImage> {
  const db = await getDb();
  const [row] = await db.insert(clientImages).values(data).returning();
  if (!row) throw new Error("Failed to save client image");
  return row;
}

export async function getActivityTimeline(clientId: string) {
  const db = await getDb();

  const actions = await db
    .select()
    .from(clientActions)
    .where(eq(clientActions.clientId, clientId))
    .orderBy(desc(clientActions.createdAt));

  return actions.map((action) => ({
    id: action.id,
    type: action.actionType,
    note: action.note,
    createdAt: action.createdAt,
  }));
}

export async function getDashboardMetrics() {
  const clientsRows = await getAllClients();
  const profiles = await Promise.all(
    clientsRows.map((c) => getClientById(c.id))
  );

  const filtered = profiles.filter((p): p is ClientFullProfile => Boolean(p));

  const totalClients = filtered.length;
  const totalBalance = filtered.reduce((sum, item) => sum + item.summary.totalBalance, 0);
  const totalAmountDue = filtered.reduce((sum, item) => sum + item.summary.totalAmountDue, 0);
  const highRiskClients = filtered.filter((item) => item.summary.riskLabel === "HIGH").length;

  return {
    totalClients,
    totalBalance,
    totalAmountDue,
    highRiskClients,
  };
}

export async function seedClientActionFromNote(params: {
  clientId: string;
  note: string;
}) {
  return addAction({
    clientId: params.clientId,
    actionType: "note",
    note: params.note,
  });
  }
