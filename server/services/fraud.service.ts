import axios from "axios";
import { db } from "@/server/db";
import { fraudAnalysis } from "@/server/db/schema";

/* ================= TYPES ================= */

export interface FraudInput {
  clientId: string;
  phones?: string[];
  loans?: any[];
  osint?: any;
}

export interface FraudResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  signals: string[];
  summary: string;
}

/* ================= SIGNAL ENGINE ================= */

function detectSignals(input: FraudInput) {
  const signals: string[] = [];

  /* PHONE */
  if (!input.phones?.length) signals.push("NO_PHONE");
  if ((input.phones?.length || 0) > 3) signals.push("MULTIPLE_PHONES");

  /* LOANS */
  const totalOverdue =
    input.loans?.reduce((a, l) => a + Number(l.overdue || 0), 0) || 0;

  if (totalOverdue > 50000) signals.push("HIGH_OVERDUE");
  if (input.loans?.some((l) => l.bucket >= 4))
    signals.push("SEVERE_DELINQUENCY");

  /* OSINT */
  if (input.osint?.confidence > 70) signals.push("HIGH_OSINT_RISK");
  if (!input.osint?.socialLinks?.length) signals.push("NO_SOCIAL");

  return signals;
}

/* ================= WEIGHTED SCORING 🔥 ================= */

const weights: Record<string, number> = {
  NO_PHONE: 15,
  MULTIPLE_PHONES: 20,
  HIGH_OVERDUE: 30,
  SEVERE_DELINQUENCY: 30,
  HIGH_OSINT_RISK: 25,
  NO_SOCIAL: 15,
};

function calculateScore(signals: string[]) {
  return Math.min(
    signals.reduce((acc, s) => acc + (weights[s] || 10), 0),
    100
  );
}

function getLevel(score: number) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/* ================= AI (STRUCTURED) ================= */

async function aiSummary(input: FraudInput, signals: string[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Return JSON: { riskLevel, summary } (short, strict JSON)",
          },
          {
            role: "user",
            content: JSON.stringify({ input, signals }).slice(0, 3000),
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${key}` },
      }
    );

    return JSON.parse(
      res.data?.choices?.[0]?.message?.content || "{}"
    );
  } catch {
    return null;
  }
}

/* ================= MAIN ================= */

export async function analyzeFraud(
  input: FraudInput
): Promise<FraudResult> {
  const signals = detectSignals(input);

  const score = calculateScore(signals);
  let level = getLevel(score);

  const ai = await aiSummary(input, signals);

  if (ai?.riskLevel) {
    level = ai.riskLevel;
  }

  const result: FraudResult = {
    score,
    level,
    signals,
    summary: ai?.summary || "Rule-based fraud analysis",
  };

  /* ================= SAVE (UPSERT) ================= */

  try {
    await db
      .insert(fraudAnalysis)
      .values({
        clientId: input.clientId,
        score,
        level,
        signals,
        aiSummary: result.summary,
      })
      .onConflictDoUpdate({
        target: fraudAnalysis.clientId,
        set: {
          score,
          level,
          signals,
          aiSummary: result.summary,
        },
      });
  } catch (err) {
    console.error("FRAUD SAVE ERROR:", err);
  }

  return result;
}
