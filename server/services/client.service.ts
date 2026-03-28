import { db } from "@/server/db";
import {
  clients,
  clientPhones,
  clientAddresses,
  clientLoans,
  clientActions,
  osintResults,
} from "@/server/db/schema";

import { eq, desc } from "drizzle-orm";

import {
  calculateFinancials,
  calculateClientFinancialSummary,
} from "./financial.service";

import { calculateRisk } from "./risk.service";

import { analyzeClient } from "./ai.service";

/* =========================
   GET FULL CLIENT PROFILE 🔥
========================= */
export async function getClientById(clientId: string) {
  /* =========================
     BASIC DATA
  ========================= */
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });

  if (!client) return null;

  /* =========================
     RELATED DATA
  ========================= */
  const phones = await db
    .select()
    .from(clientPhones)
    .where(eq(clientPhones.clientId, clientId));

  const addresses = await db
    .select()
    .from(clientAddresses)
    .where(eq(clientAddresses.clientId, clientId));

  const loans = await db
    .select()
    .from(clientLoans)
    .where(eq(clientLoans.clientId, clientId));

  const actions = await db
    .select()
    .from(clientActions)
    .where(eq(clientActions.clientId, clientId))
    .orderBy(desc(clientActions.createdAt));

  const osint = await db.query.osintResults.findFirst({
    where: eq(osintResults.clientId, clientId),
  });

  /* =========================
     FINANCIAL ENGINE
  ========================= */
  const financialLoans = loans.map((loan) =>
    calculateFinancials({
      loanType: loan.loanType,
      emi: loan.emi,
      bucket: loan.bucket,
      penaltyEnabled: loan.penaltyEnabled,
      penaltyAmount: loan.penaltyAmount,
    })
  );

  const financialSummary =
    calculateClientFinancialSummary(financialLoans);

  /* =========================
     RISK ENGINE
  ========================= */
  const lastActionDays = actions.length
    ? Math.floor(
        (Date.now() -
          new Date(actions[0].createdAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  const risk = calculateRisk({
    bucket: Math.max(...financialLoans.map((l) => l.bucket), 1),
    amountDue: financialSummary.totalAmountDue,

    hasPhone: phones.length > 0,
    hasAddress: addresses.length > 0,
    hasLoans: loans.length > 0,
    hasOsint: !!osint,

    lastActionDays,
    aiSignalsScore: 0, // هيتحدث بعد AI
  });

  /* =========================
     AI ENGINE
  ========================= */
  const ai = await analyzeClient({
    clientName: client.name,
    totalAmountDue: financialSummary.totalAmountDue,
    totalBalance: financialSummary.totalBase,
    riskScore: risk.score,
    riskLabel: risk.label,
    lastActionDays,

    phonesCount: phones.length,
    addressesCount: addresses.length,
    loansCount: loans.length,

    osintConfidence: osint?.confidenceScore ?? 0,
    osintSummary: osint?.summary ?? null,

    loanTypes: loans.map((l) => l.loanType),
  });

  /* =========================
     FINAL RESPONSE
  ========================= */
  return {
    client,

    phones,
    addresses,

    loans: financialLoans,

    actions,

    osint,

    summary: {
      totalEMI: financialSummary.totalEMI,
      totalAmountDue: financialSummary.totalAmountDue,
      totalBalance: financialSummary.totalBase,

      riskScore: risk.score,
      riskLabel: risk.label,

      lastActionDays,
    },

    ai,
  };
}

/* =========================
   GET ALL CLIENTS (LIGHT)
========================= */
export async function getAllClients() {
  const data = await db
    .select()
    .from(clients)
    .orderBy(desc(clients.createdAt));

  return data;
}

/* =========================
   CREATE CLIENT (FULL)
========================= */
export async function createClientFull(data: {
  name: string;
  email?: string;
  company?: string;

  phones: string[];
  addresses: string[];

  loans: {
    loanType: string;
    emi: number;
    balance: number;
  }[];
}) {
  /* =========================
     CREATE CLIENT
  ========================= */
  const [client] = await db
    .insert(clients)
    .values({
      name: data.name,
      email: data.email,
      company: data.company,
    })
    .returning();

  /* =========================
     PHONES
  ========================= */
  for (const phone of data.phones) {
    await db.insert(clientPhones).values({
      clientId: client.id,
      phone,
    });
  }

  /* =========================
     ADDRESSES
  ========================= */
  for (const address of data.addresses) {
    await db.insert(clientAddresses).values({
      clientId: client.id,
      address,
    });
  }

  /* =========================
     LOANS
  ========================= */
  for (const loan of data.loans) {
    await db.insert(clientLoans).values({
      clientId: client.id,
      loanType: loan.loanType,
      emi: loan.emi.toString(),
      balance: loan.balance.toString(),
      bucket: 1,
    });
  }

  return client;
                                   }
