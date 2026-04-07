import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, clientLoans, clientActions, osintResults, callLogs, followups } from "@/server/db/schema";
import { eq, and, or, desc, type SQL } from "drizzle-orm";
import type { UserRole } from "@/server/core/rbac";

export function calculateDomainInfo(domainType: string, cycleStartDateStr: string | null) {
  const now = new Date();
  const start = cycleStartDateStr ? new Date(cycleStartDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(start);

  if (domainType === "FIRST") {
    end.setMonth(start.getMonth() + 3);
  } else if (domainType === "THIRD") {
    start.setDate(15);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (domainType === "WRITEOFF") {
    end.setMonth(start.getMonth() + 3);
  }

  return { start, end, isActive: now >= start && now <= end };
}

export function getOwnershipScopeCondition(userId: string, role: UserRole): SQL | undefined {
  if (role === "collector") {
    return eq(clients.ownerId, userId);
  }
  return undefined;
}

export async function getClientsForUser(userId: string, role: UserRole) {
  try {
    if (role === "hidden_admin" || role === "admin") {
      return await db.select().from(clients).orderBy(desc(clients.createdAt));
    }
    if (role === "supervisor") {
      return await db.select().from(clients)
        .where(eq(clients.portfolioType, "WRITEOFF"))
        .orderBy(desc(clients.createdAt));
    }
    if (role === "team_leader") {
      return await db.select().from(clients)
        .where(or(eq(clients.portfolioType, "ACTIVE"), eq(clients.ownerId, userId)))
        .orderBy(desc(clients.createdAt));
    }

    return await db.select().from(clients)
      .where(eq(clients.ownerId, userId))
      .orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error("getClientsForUser error:", error);
    return [];
  }
}

export async function getClientById(id: string, viewer?: { userId: string; role: UserRole }) {
  try {
    const ownershipFilter = viewer ? getOwnershipScopeCondition(viewer.userId, viewer.role) : undefined;
    const whereClause = ownershipFilter ? and(eq(clients.id, id), ownershipFilter) : eq(clients.id, id);

    const clientList = await db.select().from(clients).where(whereClause);
    const client = clientList[0];
    if (!client) return null;

    const [phones, addresses, loans, actions, osint, calls, nextFollowups] = await Promise.all([
      db.select().from(clientPhones).where(eq(clientPhones.clientId, id)),
      db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)),
      db.select().from(clientLoans).where(eq(clientLoans.clientId, id)),
      db.select().from(clientActions).where(eq(clientActions.clientId, id)),
      db.select().from(osintResults).where(eq(osintResults.clientId, id)).limit(1).then(res => res[0]),
      db.select().from(callLogs).where(eq(callLogs.clientId, id)).orderBy(desc(callLogs.createdAt)),
      db.select().from(followups).where(eq(followups.clientId, id)).orderBy(desc(followups.scheduledFor))
    ]);

    return {
      ...client,
      phones,
      addresses,
      loans,
      actions,
      osint,
      calls,
      followups: nextFollowups
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return null;
  }
}

export async function createClientFull(data: any, ownerId: string) {
  try {
    return await db.transaction(async (tx) => {
      const [client] = await tx.insert(clients).values({
        name: data.name,
        customerId: data.customerId,
        email: data.email,
        company: data.company,
        notes: data.notes,
        ownerId: ownerId,
        portfolioType: data.portfolioType || "ACTIVE",
        domainType: data.domainType || "FIRST",
        branch: data.branch,
        cycleStartDate: data.cycleStartDate || new Date().toISOString().split('T')[0],
        cycleEndDate: data.cycleEndDate || null,
      }).returning();

      if (data.phones?.length) {
        await tx.insert(clientPhones).values(data.phones.map((p: string) => ({ clientId: client.id, phone: p })));
      }

      if (data.addresses?.length) {
        await tx.insert(clientAddresses).values(data.addresses.map((a: any) => ({
          clientId: client.id,
          address: a.address,
          city: a.city,
          area: a.area,
          lat: a.lat?.toString(),
          lng: a.lng?.toString(),
          isPrimary: a.isPrimary || false
        })));
      }

      if (data.loans?.length) {
        await tx.insert(clientLoans).values(data.loans.map((l: any) => ({
          clientId: client.id,
          loanType: l.loanType,
          emi: l.emi?.toString(),
          balance: l.balance?.toString(),
          overdue: l.overdue?.toString(),
          bucket: l.bucket || 1,
          amountDue: l.amountDue?.toString(),
          penaltyEnabled: l.penaltyEnabled || false,
          penaltyAmount: l.penaltyAmount?.toString() || "0"
        })));
      }

      return client;
    });
  } catch (error) {
    console.error("createClientFull error:", error);
    throw error;
  }
}

export async function getAllClients() {
  try {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error("getAllClients error:", error);
    return [];
  }
}
