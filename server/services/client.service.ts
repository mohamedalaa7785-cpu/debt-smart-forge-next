import { db } from "@/server/db";
import { clients, clientPhones, clientAddresses, clientLoans, clientActions, osintResults, users } from "@/server/db/schema";
import { eq, and, or, desc, inArray } from "drizzle-orm";

/* =========================
   DOMAIN LOGIC 🏦
========================= */
export function calculateDomainInfo(domainType: string, cycleStartDate: Date | null) {
  const now = new Date();
  const start = cycleStartDate || new Date(now.getFullYear(), now.getMonth(), 1);
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

    const [phones, addresses, loans, actions, osint] = await Promise.all([
      db.select().from(clientPhones).where(eq(clientPhones.clientId, id)),
      db.select().from(clientAddresses).where(eq(clientAddresses.clientId, id)),
      db.select().from(clientLoans).where(eq(clientLoans.clientId, id)),
      db.select().from(clientActions).where(eq(clientActions.clientId, id)),
      db.select().from(osintResults).where(eq(osintResults.clientId, id)).limit(1).then(res => res[0])
    ]);

    return {
      ...client,
      phones,
      addresses,
      loans,
      actions,
      osint
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return null;
  }
}

/* =========================
   CREATE CLIENT
========================= */
export async function createClientFull(data: any, ownerId: string) {
  try {
    return await db.transaction(async (tx) => {
      const [client] = await tx.insert(clients).values({
        name: data.name,
        email: data.email,
        company: data.company,
        notes: data.notes,
        ownerId: ownerId,
        portfolioType: data.portfolioType || "ACTIVE",
        domainType: data.domainType || "FIRST",
        cycleStartDate: data.cycleStartDate ? new Date(data.cycleStartDate) : new Date(),
        cycleEndDate: data.cycleEndDate ? new Date(data.cycleEndDate) : null,
      }).returning();

      if (data.phones?.length) {
        await tx.insert(clientPhones).values(data.phones.map((p: string) => ({ clientId: client.id, phone: p })));
      }

      if (data.loans?.length) {
        await tx.insert(clientLoans).values(data.loans.map((l: any) => ({
          clientId: client.id,
          loanType: l.loanType,
          emi: l.emi?.toString(),
          balance: l.balance?.toString(),
          bucket: l.bucket || 1,
          amountDue: l.amountDue?.toString()
        })));
      }

      return client;
    });
  } catch (error) {
    console.error("createClientFull error:", error);
    throw error;
  }
}
