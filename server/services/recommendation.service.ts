import axios from "axios";

/* =========================
   TYPES
========================= */

export interface RecommendationInput {
  osint?: any;
  fraud?: any;
  loans?: any[];
}

export interface RecommendationResult {
  action: "CALL" | "VISIT" | "WAIT" | "SKIP";
  priority: "low" | "medium" | "high";
  reason: string;
}

/* =========================
   RULE ENGINE 🔥
========================= */

function ruleEngine(input: RecommendationInput): RecommendationResult {
  const fraudScore = input.fraud?.score || 0;
  const osintScore = input.osint?.confidence || 0;

  const overdue =
    input.loans?.reduce(
      (sum, l) => sum + Number(l.overdue || 0),
      0
    ) || 0;

  /* 🔥 HIGH RISK */
  if (fraudScore > 70 || osintScore > 80) {
    return {
      action: "VISIT",
      priority: "high",
      reason: "High risk detected (fraud or OSINT)",
    };
  }

  /* 🔥 MONEY FOCUS */
  if (overdue > 50000) {
    return {
      action: "CALL",
      priority: "high",
      reason: "High overdue amount",
    };
  }

  /* 🔥 MEDIUM */
  if (fraudScore > 40 || osintScore > 50) {
    return {
      action: "CALL",
      priority: "medium",
      reason: "Moderate risk detected",
    };
  }

  /* 🔥 LOW */
  if (overdue < 1000) {
    return {
      action: "WAIT",
      priority: "low",
      reason: "Low financial impact",
    };
  }

  return {
    action: "CALL",
    priority: "medium",
    reason: "Default collection strategy",
  };
}

/* =========================
   AI LAYER 🤖
========================= */

async function aiDecision(input: RecommendationInput) {
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
              "You are a debt collection AI. Decide best action: CALL, VISIT, WAIT, SKIP.",
          },
          {
            role: "user",
            content: JSON.stringify(input).slice(0, 3000),
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${key}`,
        },
      }
    );

    return res.data?.choices?.[0]?.message?.content;
  } catch {
    return null;
  }
}

/* =========================
   MAIN 🔥
========================= */

export async function getRecommendation(
  input: RecommendationInput
): Promise<RecommendationResult> {
  const base = ruleEngine(input);

  const ai = await aiDecision(input);

  if (ai && typeof ai === "string") {
    if (ai.includes("VISIT")) base.action = "VISIT";
    else if (ai.includes("CALL")) base.action = "CALL";
    else if (ai.includes("WAIT")) base.action = "WAIT";
    else if (ai.includes("SKIP")) base.action = "SKIP";
  }

  return base;
}
