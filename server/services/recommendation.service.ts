import axios from "axios";

/* ================= TYPES ================= */

export interface RecommendationInput {
  osint?: any;
  fraud?: any;
  loans?: any[];
}

export interface RecommendationResult {
  action: "CALL" | "VISIT" | "WAIT" | "SKIP";
  priority: "low" | "medium" | "high" | "urgent";
  reason: string;
}

/* ================= HELPERS ================= */

function getOverdue(loans: any[] = []) {
  return loans.reduce((sum, l) => sum + Number(l.overdue || 0), 0);
}

/* ================= RULE ENGINE 🔥 ================= */

function ruleEngine(input: RecommendationInput): RecommendationResult {
  const fraudScore = input.fraud?.score || 0;
  const osintScore = input.osint?.confidence || 0;
  const overdue = getOverdue(input.loans);

  /* 🔥 CRITICAL */
  if (fraudScore >= 85) {
    return {
      action: "VISIT",
      priority: "urgent",
      reason: "Critical fraud risk",
    };
  }

  /* 🔥 HIGH RISK */
  if (fraudScore > 70 || osintScore > 80) {
    return {
      action: "VISIT",
      priority: "high",
      reason: "High risk detected",
    };
  }

  /* 🔥 HIGH MONEY */
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
      reason: "Moderate risk",
    };
  }

  /* 🔥 LOW VALUE */
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
    reason: "Default strategy",
  };
}

/* ================= PRIORITY BOOST 🔥 ================= */

function adjustPriority(base: RecommendationResult, input: RecommendationInput) {
  const overdue = getOverdue(input.loans);
  const fraudScore = input.fraud?.score || 0;

  let priority = base.priority;

  if (overdue > 100000 || fraudScore > 85) {
    priority = "urgent";
  } else if (overdue > 50000) {
    priority = "high";
  }

  return {
    ...base,
    priority,
  };
}


function isRecommendationAction(value: unknown): value is RecommendationResult["action"] {
  return value === "CALL" || value === "VISIT" || value === "WAIT" || value === "SKIP";
}

/* ================= AI (STRUCTURED) ================= */

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
              "Return JSON only: { action, reason } (CALL | VISIT | WAIT | SKIP)",
          },
          {
            role: "user",
            content: JSON.stringify(input).slice(0, 3000),
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${key}` },
      }
    );

    const raw = JSON.parse(res.data?.choices?.[0]?.message?.content || "{}");
    return raw && typeof raw === "object" ? raw : null;
  } catch {
    return null;
  }
}

/* ================= MAIN ================= */

export async function getRecommendation(
  input: RecommendationInput
): Promise<RecommendationResult> {
  /* 🔥 RULE BASE */
  let result = ruleEngine(input);

  /* 🔥 PRIORITY ADJUST */
  result = adjustPriority(result, input);

  /* 🔥 AI LAYER */
  const ai = await aiDecision(input);

  if (isRecommendationAction(ai?.action)) {
    result.action = ai.action;
  }

  if (typeof ai?.reason === "string" && ai.reason.trim()) {
    result.reason = ai.reason.trim();
  }

  return result;
     }
