import { db } from "@/server/db";
import { legalCases, clients } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/* =========================
   TYPES
========================= */
export interface LegalNoticeInput {
  clientName: string;
  amountDue: number;
  bankName: string;
  date: string;
}

/* =========================
   PDF GENERATOR (INZAR) 📄
========================= */
export async function generateLegalNotice(input: LegalNoticeInput): Promise<string> {
  // In a real app, we'd use a library like 'jspdf' or 'pdfkit'
  // For this implementation, we'll return a formatted text template
  // that can be rendered as a PDF or shown in the UI.
  
  const template = `
    LEGAL NOTICE (INZAR)
    -------------------
    Date: ${input.date}
    To: ${input.clientName}
    
    Subject: FINAL DEMAND FOR PAYMENT
    
    Dear ${input.clientName},
    
    This is a formal legal notice regarding your outstanding debt with ${input.bankName}.
    As of today, your total amount due is EGP ${input.amountDue.toLocaleString('en-EG')}.
    
    Failure to settle this amount within 7 days will result in immediate legal action,
    including but not limited to filing a court case and reporting to credit bureaus.
    
    Regards,
    Legal Department
    ${input.bankName}
  `;
  
  return template;
}

/* =========================
   COURT SESSION TRACKER ⚖️
========================= */
export async function getLegalCases(clientId: string) {
  return await db.select().from(legalCases).where(eq(legalCases.clientId, clientId));
}

export async function addLegalCase(data: any) {
  return await db.insert(legalCases).values(data).returning();
}

/* =========================
   BOUNCED CHECK TRACKER 🚫
========================= */
export async function trackBouncedCheck(clientId: string, checkNumber: string, amount: number) {
  return await addLegalCase({
    clientId,
    caseNumber: checkNumber,
    caseType: "Bounced Check",
    status: "pending",
    lastUpdate: `Bounced check #${checkNumber} for EGP ${amount.toLocaleString('en-EG')}`,
  });
}
