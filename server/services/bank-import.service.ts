import OpenAI from "openai";
import { parseNumber, safeJsonParse } from "@/lib/utils";
import { calculateFinancials } from "@/server/services/financial.service";

export type ImportedLoan = {
  loanType: string;
  loanNumber?: string | null;
  cycle?: number | null;
  organization?: string | null;
  willLegal?: boolean;
  referralDate?: string | null;
  collectorPercentage?: number | null;
  balance: number;
  overdue: number;
  amountDue: number;
  emi: number;
  bucket: number;
  penaltyEnabled: boolean;
  penaltyAmount: number;
};

export type ImportedClient = {
  name: string;
  customerId?: string | null;
  email?: string | null;
  company?: string | null;
  branch?: string | null;
  notes?: string | null;
  phones: string[];
  addresses: Array<{ address: string; city?: string | null; area?: string | null }>;
  loans: ImportedLoan[];
};

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function parseNumeric(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    return parseNumber(normalized, 0);
  }
  return parseNumber(value, 0);
}

function normalizePhone(input: string) {
  return (input || "").replace(/[^\d]/g, "").trim();
}

function normalizeClient(raw: any): ImportedClient | null {
  const name = String(raw?.name || "").trim();
  if (!name) return null;

  const phones = Array.isArray(raw?.phones)
    ? raw.phones.map((p: any) => normalizePhone(String(p || ""))).filter(Boolean)
    : [];

  const addresses = Array.isArray(raw?.addresses)
    ? raw.addresses
        .map((a: any) => ({
          address: String(a?.address || "").trim(),
          city: a?.city ? String(a.city).trim() : null,
          area: a?.area ? String(a.area).trim() : null,
        }))
        .filter((a: any) => a.address)
    : [];

  const loans = Array.isArray(raw?.loans)
    ? raw.loans
        .map((loan: any) => {
          const loanType = String(loan?.loanType || "MC").trim() || "MC";
          const emi = parseNumeric(loan?.emi);
          const bucket = Math.max(1, Math.round(parseNumeric(loan?.bucket) || 1));
          const balance = parseNumeric(loan?.balance);
          const overdue = parseNumeric(loan?.overdue);

          const penaltyEnabled = Boolean(loan?.penaltyEnabled ?? overdue > 0);
          const explicitPenalty = parseNumeric(loan?.penaltyAmount);
          const fin = calculateFinancials({
            loanType,
            emi,
            bucket,
            penaltyEnabled,
            penaltyAmount: explicitPenalty || undefined,
          });

          const parsedAmountDue = parseNumeric(loan?.amountDue);
          const amountDue = parsedAmountDue > 0 ? parsedAmountDue : Math.max(overdue, fin.amountDue);

          return {
            loanType,
            loanNumber: loan?.loanNumber ? String(loan.loanNumber).trim() : null,
            cycle: parseNumeric(loan?.cycle) || null,
            organization: loan?.organization ? String(loan.organization).trim() : null,
            willLegal: Boolean(loan?.willLegal),
            referralDate: loan?.referralDate ? String(loan.referralDate) : null,
            collectorPercentage:
              loan?.collectorPercentage !== undefined &&
              loan?.collectorPercentage !== null &&
              String(loan?.collectorPercentage).trim() !== ""
                ? parseNumeric(loan?.collectorPercentage)
                : null,
            balance,
            overdue,
            amountDue,
            emi,
            bucket,
            penaltyEnabled,
            penaltyAmount: fin.penaltyAmount,
          } satisfies ImportedLoan;
        })
        .filter((l: ImportedLoan) => l.loanType)
    : [];

  if (!phones.length || !loans.length) return null;

  return {
    name,
    customerId: raw?.customerId ? String(raw.customerId).trim() : null,
    email: raw?.email ? String(raw.email).trim() : null,
    company: raw?.company ? String(raw.company).trim() : null,
    branch: raw?.branch ? String(raw.branch).trim() : null,
    notes: raw?.notes ? String(raw.notes).trim() : null,
    phones: Array.from(new Set(phones)),
    addresses,
    loans,
  };
}

function parseBankTextFallback(text: string): ImportedClient[] {
  const chunks = text
    .split(/\n\s*\d+\)\s+/g)
    .map((c) => c.trim())
    .filter(Boolean);

  const out: ImportedClient[] = [];

  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const name = lines[0]?.split("—")[0]?.trim();
    if (!name) continue;

    const phonesLine = lines.find((l) => l.toLowerCase().startsWith("phones") || l.toLowerCase().startsWith("phone"));
    const phones = phonesLine
      ? phonesLine
          .split(":")
          .slice(1)
          .join(":")
          .split(/[\/|,]/g)
          .map((p) => normalizePhone(p))
          .filter(Boolean)
      : [];

    const addressLine = lines.find((l) => l.toLowerCase().startsWith("address"));
    const branchLine = lines.find((l) => l.toLowerCase().startsWith("branch"));

    const loanType = (lines.find((l) => l.toLowerCase().includes("product type"))?.split(":")[1] || "MC").trim();
    const loanNumber = lines.find((l) => l.toLowerCase().includes("loan number"))?.split(":")[1]?.trim() || null;
    const balance = parseNumeric(lines.find((l) => l.toLowerCase().startsWith("balance"))?.split(":")[1]);
    const overdue = parseNumeric(lines.find((l) => l.toLowerCase().includes("amount overdue"))?.split(":")[1]);
    const emi = parseNumeric(lines.find((l) => l.toLowerCase().startsWith("emi"))?.split(":")[1]);
    const cycle = parseNumeric(lines.find((l) => l.toLowerCase().startsWith("cyl") || l.toLowerCase().startsWith("cycle"))?.split(":")[1]) || null;
    const bucket = parseNumeric(lines.find((l) => l.toLowerCase().startsWith("bucket"))?.split(":")[1]) || 1;
    const organization = lines.find((l) => l.toLowerCase().startsWith("organization"))?.split(":")[1]?.trim() || null;
    const willLegal = /yes|true|y/i.test(lines.find((l) => l.toLowerCase().includes("wrl legal") || l.toLowerCase().includes("will legal")) || "");
    const referralDate = lines.find((l) => l.toLowerCase().includes("referral date"))?.split(":")[1]?.trim() || null;
    const collectorPercentage = parseNumeric(lines.find((l) => l.toLowerCase().includes("collector"))?.split(":")[1]);

    const fin = calculateFinancials({ loanType, emi, bucket, penaltyEnabled: overdue > 0 });

    const normalized = normalizeClient({
      name,
      branch: branchLine?.split(":")[1]?.trim() || null,
      phones,
      addresses: addressLine ? [{ address: addressLine.split(":").slice(1).join(":").trim() }] : [],
      loans: [
        {
          loanType,
          loanNumber,
          cycle,
          organization,
          willLegal,
          referralDate,
          collectorPercentage: collectorPercentage || null,
          balance,
          overdue,
          emi,
          bucket,
          amountDue: Math.max(overdue, fin.amountDue),
          penaltyEnabled: overdue > 0,
          penaltyAmount: fin.penaltyAmount,
        },
      ],
      notes: "Imported with fallback parser",
    });

    if (normalized) out.push(normalized);
  }

  return out;
}

function buildPrompt(rawText?: string) {
  return `Extract debt clients from bank document and return ONLY JSON with this exact shape:
{
  "clients": [
    {
      "name": "",
      "customerId": "",
      "email": "",
      "company": "",
      "branch": "",
      "notes": "",
      "phones": [""],
      "addresses": [{"address": "", "city": "", "area": ""}],
      "loans": [{
        "loanType": "MC|PIL|...",
        "loanNumber": "",
        "balance": 0,
        "overdue": 0,
        "amountDue": 0,
        "cycle": 5,
        "emi": 0,
        "bucket": 1,
        "organization": "",
        "willLegal": false,
        "referralDate": "",
        "collectorPercentage": 0,
        "penaltyEnabled": true,
        "penaltyAmount": 0
      }]
    }
  ]
}
Rules: merge duplicate client names into one client with multiple loans, keep only real phones, normalize numbers, never invent missing data, keep unknown fields empty.
${rawText ? `
SOURCE_TEXT:
${rawText}` : ""}`;
}

export async function parseBankImportInput(params: { rawText?: string; imageUrl?: string }) {
  const openai = getOpenAI();

  if (!openai) {
    if (!params.rawText) {
      throw new Error("OPENAI_API_KEY is required for image parsing");
    }
    return parseBankTextFallback(params.rawText);
  }

  const userContent: any[] = [{ type: "text", text: buildPrompt(params.rawText) }];

  if (params.imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: params.imageUrl },
    });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You extract structured banking collection data accurately." },
      { role: "user", content: userContent },
    ],
  });

  const content = completion.choices[0]?.message?.content || "";
  const parsed = safeJsonParse<{ clients?: any[] } | null>(content, null);

  const clients = Array.isArray(parsed?.clients) ? parsed!.clients : [];
  const normalized = clients.map(normalizeClient).filter(Boolean) as ImportedClient[];

  if (normalized.length > 0) {
    return normalized;
  }

  if (params.rawText) {
    return parseBankTextFallback(params.rawText);
  }

  return [];
}
