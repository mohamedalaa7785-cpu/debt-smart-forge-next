import axios from "axios";
import { db } from "@/server/db";
import { fraudAnalysis } from "@/server/db/schema";

/* =========================
   TYPES
========================= */

export interface FraudInput {
  clientId: string;
  phones?: string[];
  loans?: any[];
  osint?: any;
}

export interface FraudResult {
  score: number;
  level: "low" | "medium" | "high";
  signals: string[];
  summary: string;
}

/* =========================
   RULE ENGINE 🔥
========================= */

function detectSignals(input: FraudInput) {
  const signals: string[] = [];

  /* 🔥 PHONE CHECK */
  if (!input.phones || input.phones.length === 0) {
    signals.push("No phone data");
  }

  if (input.phones && input.phones.length > 3) {
    signals.push("Multiple phone numbers");
  }

  /* 🔥 LOAN CHECK */
  const totalOverdue =
    input.loans?.reduce(
      (acc, l) => acc + Number(l.overdue || 0),
      0
    ) || 0;

  if (totalOverdue > 50000) {
    signals.push("High overdue amount");
  }

  if (input.loans?.some((l) => l.bucket >= 4)) {
    signals.push("Severe delinquency");
  }

  /* 🔥 OSINT */
  if (input.osint?.confidence > 70) {
    signals.push("High OSINT risk");
  }

  if (!input.osint?.socialLinks?.length) {
    signals.push("No social presence");
  }

  return signals;
}

/* =========================
   SCORING
========================= */

function calculateScore(signals: string[]) {
  let score = 0;

  for (const s of signals) {
    if (s.includes("High overdue")) score += 30;
    else if (s.includes("Severe")) score += 30;
    else if (s.includes("High OSINT")) score += 25;
    else if (s.includes("Multiple phone")) score += 15;
    else score += 10;
  }

  return Math.min(score, 100);
}

function getLevel(score: number): "low" | "medium" | "high" {
  if (score > 70) return "high";
  if (score > 40) return "medium";
  return "low";
}

/* =========================
   AI ANALYSIS 🤖
========================= */

async function aiSummary(input: FraudInput, signals: string[]) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "No AI analysis";

  try {
    const res = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a fraud detection system. Analyze risk and give short summary.",
          },
          {
            role: "user",
            content: JSON.stringify({ input, signals }).slice(0, 3000),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      }
    );

    return res.data?.choices?.[0]?.message?.content || "";
  } catch {
    return "AI analysis failed";
  }
}

/* =========================
   MAIN 🔥
========================= */

export async function analyzeFraud(
  input: FraudInput
): Promise<FraudResult> {
  const signals = detectSignals(input);

  const score = calculateScore(signals);
  const level = getLevel(score);

  const summary = await aiSummary(input, signals);

  const result: FraudResult = {
    score,
    level,
    signals,
    summary,
  };

  /* 🔥 SAVE */
  try {
    await db.insert(fraudAnalysis).values({
      clientId: input.clientId,
      score,
      level,
      signals,
      aiSummary: summary,
    });
  } catch (err) {
    console.error("FRAUD SAVE ERROR:", err);
  }

  return result;
}
