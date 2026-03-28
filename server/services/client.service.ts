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
  try {
    if (!clientId) return null;

    /* =========================
       BASIC DATA
    ========================= */
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) return null;

    /* =========================
       PARALLEL FETCH 🚀
    ========================= */
    const [phones, addresses, loans, actions, osint] =
      await Promise.all([
        db
          .select()
          .from(clientPhones)
          .where(eq(clientPhones.clientId, clientId)),

        db
          .select()
          .from(clientAddresses)
          .where(eq(clientAddresses.clientId, clientId)),

        db
          .select()
          .from(clientLoans)
          .where(eq(clientLoans.clientId, clientId)),

        db
          .select()
          .from(clientActions)
          .where(eq(clientActions.clientId, clientId))
          .orderBy(desc(clientActions.createdAt)),

        db.query.osintResults.findFirst({
          where: eq(osintResults.clientId, clientId),
        }),
      ]);

    /* =========================
       FINANCIAL ENGINE
    ========================= */
    const financialLoans = loans.map((loan) =>
      calculateFinancials({
        loanType: loan.loanType,
        emi: Number(loan.emi),
        bucket: loan.bucket,
        penaltyEnabled: loan.penaltyEnabled,
        penaltyAmount: Number(loan.penaltyAmount || 0),
      })
    );

    const financialSummary =
      calculateClientFinancialSummary(financialLoans);

    /* =========================
       LAST ACTION DAYS
    ========================= */
    const lastActionDays = actions.length
      ? Math.floor(
          (Date.now() -
            new Date(actions[0].createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 999;

    /* =========================
       AI SIGNALS FROM ACTIONS 🔥
    ========================= */
    const actionScore = actions.reduce((acc, a) => {
      if (a.actionType === "CALL") return acc + 5;
      if (a.actionType === "WHATSAPP") return acc + 3;
      if (a.actionType === "PROMISE") return acc + 10;
      if (a.actionType === "BROKEN_PROMISE") return acc - 10;
      if (a.actionType === "PAID") return acc + 15;
      return acc;
    }, 0);

    /* =========================
       BASE RISK
    ========================= */
    const maxBucket =
      financialLoans.length > 0
        ? Math.max(...financialLoans.map((l) => l.bucket))
        : 1;

    let risk = calculateRisk({
      bucket: maxBucket,
      amountDue: financialSummary.totalAmountDue,

      hasPhone: phones.length > 0,
      hasAddress: addresses.length > 0,
      hasLoans: loans.length > 0,
      hasOsint: !!osint,

      lastActionDays,
      aiSignalsScore: actionScore,
    });

    /* =========================
       AI ENGINE 🧠
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

      aiSignalsScore: actionScore,
    });

    /* =========================
       FINAL RISK UPDATE 🔥
    ========================= */
    risk = calculateRisk({
      bucket: maxBucket,
      amountDue: financialSummary.totalAmountDue,

      hasPhone: phones.length > 0,
      hasAddress: addresses.length > 0,
      hasLoans: loans.length > 0,
      hasOsint: !!osint,

      lastActionDays,
      aiSignalsScore:
        actionScore + (ai?.confidence || 0) / 5,
    });

    /* =========================
       PRIORITY SCORE 🔥
    ========================= */
    const priority =
      financialSummary.totalAmountDue * 0.5 +
      risk.score * 10 -
      lastActionDays * 2;

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

        priorityScore: Math.round(priority),

        lastActionDays,
      },

      ai,
    };
  } catch (error) {
    console.error("getClientById error:", error);
    return null;
  }
}

/* =========================
   GET ALL CLIENTS (LIGHT)
========================= */
export async function getAllClients() {
  try {
    return await db
      .select({
        id: clients.id,
        name: clients.name,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt));
  } catch (error) {
    console.error("getAllClients error:", error);
    return [];
  }
}

/* =========================
   CREATE CLIENT (TRANSACTION) 🔥
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
  try {
    if (!data.name) {
      throw new Error("Name is required");
    }

    return await db.transaction(async (tx) => {
      /* =========================
         CLIENT
      ========================= */
      const [client] = await tx
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
      if (data.phones?.length) {
        await tx.insert(clientPhones).values(
          data.phones.map((phone) => ({
            clientId: client.id,
            phone,
          }))
        );
      }

      /* =========================
         ADDRESSES
      ========================= */
      if (data.addresses?.length) {
        await tx.insert(clientAddresses).values(
          data.addresses.map((address) => ({
            clientId: client.id,
            address,
          }))
        );
      }

      /* =========================
         LOANS
      ========================= */
      if (data.loans?.length) {
        await tx.insert(clientLoans).values(
          data.loans.map((loan) => ({
            clientId: client.id,
            loanType: loan.loanType,
            emi: loan.emi.toString(),
            balance: loan.balance.toString(),
            bucket: 1,
            penaltyEnabled: false,
            penaltyAmount: "0",
          }))
        );
      }

      return client;
    });
  } catch (error) {
    console.error("createClientFull error:", error);
    throw error;
  }
      }
