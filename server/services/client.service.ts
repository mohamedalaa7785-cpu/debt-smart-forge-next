import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, clientLoans, clientActions, osintResults, users, callLogs, followups } from "@/server/db/schema";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";

/* =========================
   DOMAIN LOGIC 🏦
========================= */
export function calculateDomainInfo(domainType: string, cycleStartDateStr: string | null) {
  const now = new Date();
  const start = cycleStartDateStr ? new Date(cycleStartDateStr) : new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(start);

  if (domainType === "FIRST") {
    // Starts at beginning of month, duration 3 months
    end.setMonth(start.getMonth() + 3);
  } else if (domainType === "THIRD") {
    // Starts at mid-month, ends at end of month
    start.setDate(15);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (domainType === "WRITEOFF") {
    // Every 3 months, dynamic based on bank (defaulting to 3 months from start)
    end.setMonth(start.getMonth() + 3);
  }

  return {
    start,
    end,
    isActive: now >= start && now <= end
  };
}

/* =========================
   GET CLIENTS (WITH PERMISSIONS) 👥
========================= */
export async function getClientsForUser(userId: string, role: string) {
  try {
    if (role === "hidden_admin" || role === "admin") {
      // Adel / Admin: Sees ALL
      return await db.select().from(clients).orderBy(desc(clients.createdAt));
    } else if (role === "supervisor") {
      // Loay / Supervisor: Sees ALL WRITEOFF
      return await db.select().from(clients)
        .where(eq(clients.portfolioType, "WRITEOFF"))
        .orderBy(desc(clients.createdAt));
    } else if (role === "team_leader") {
      // Team Leader: Sees team clients (e.g., all ACTIVE or those they own)
      return await db.select().from(clients)
        .where(or(eq(clients.portfolioType, "ACTIVE"), eq(clients.ownerId, userId)))
        .orderBy(desc(clients.createdAt));
    } else {
      // Collector: Sees ONLY own clients
      return await db.select().from(clients)
        .where(eq(clients.ownerId, userId))
        .orderBy(desc(clients.createdAt));
    }
  } catch (error) {
    console.error("getClientsForUser error:", error);
    return [];
  }
}

/* =========================
   GET CLIENT BY ID (FULL DATA)
========================= */
export async function getClientById(id: string) {
  try {
    const clientList = await db.select().from(clients).where(eq(clients.id, id));
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

/* =========================
   ACCESS CONTROL 🔐
========================= */
export function canAccessClient(
  client: { ownerId: string | null; portfolioType: string | null } | null,
  userId: string,
  role: string
) {
  if (!client) return false;

  if (role === "hidden_admin" || role === "admin") return true;
  if (role === "supervisor") return client.portfolioType === "WRITEOFF";
  if (role === "team_leader") {
    return client.portfolioType === "ACTIVE" || client.ownerId === userId;
  }

  return client.ownerId === userId;
}

/* =========================
   CREATE CLIENT
========================= */
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

/* =========================
   GET ALL CLIENTS (FOR PRIORITY)
========================= */
export async function getAllClients() {
  try {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error("getAllClients error:", error);
    return [];
  }
}
