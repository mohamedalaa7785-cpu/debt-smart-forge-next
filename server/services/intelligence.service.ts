import type { AIResult } from "@/server/services/ai.service";

export type IntelligenceEvidenceStatus = "verified" | "suspected" | "stale" | "invalid";

export interface ClientIntelligenceProfile {
  identitySummary: string;
  contactabilityScore: number;
  responsivenessScore: number;
  riskScore: number;
  behaviorType: string;
  preferredChannel: "call" | "whatsapp" | "mixed";
  probabilityToPay: number;
  suggestedNextAction: string;
  followUpRecommendation: string;
  legalEscalationRecommendation: string;
  enrichmentConfidence: number;
  evidenceStatus: IntelligenceEvidenceStatus;
  lastVerifiedAt: string;
}

export function buildClientIntelligenceProfile(params: {
  client: {
    name: string;
    phones: Array<{ phone: string }>;
    addresses: Array<{ address: string | null }>;
    actions: Array<{ actionType: string | null; createdAt: Date | null; result: string | null }>;
    loans: Array<{ overdue: string | null; amountDue: string | null; bucket: number | null }>;
    osint?: { confidenceScore: number | null; summary: string | null } | null;
  };
  ai: AIResult;
  riskScore: number;
}): ClientIntelligenceProfile {
  const { client, ai, riskScore } = params;

  const phonesCount = client.phones.length;
  const addressCount = client.addresses.filter((a) => Boolean(a.address)).length;
  const actionsCount = client.actions.length;
  const osintConfidence = Number(client.osint?.confidenceScore || 0);

  const contactabilityScore = Math.min(100, phonesCount * 25 + addressCount * 10 + (osintConfidence >= 60 ? 20 : 0));

  const positiveSignals = client.actions.filter((a) => {
    const r = String(a.result || "").toLowerCase();
    return r.includes("promise") || r.includes("paid") || r.includes("callback");
  }).length;

  const responsivenessScore =
    actionsCount === 0 ? 0 : Math.min(100, Math.round((positiveSignals / actionsCount) * 100 + ai.paymentProbability * 0.3));

  const preferredChannel =
    client.actions.filter((a) => String(a.actionType || "").toUpperCase() === "WHATSAPP").length >
    client.actions.filter((a) => String(a.actionType || "").toUpperCase() === "CALL").length
      ? "whatsapp"
      : "call";

  const topBucket = Math.max(0, ...client.loans.map((l) => Number(l.bucket || 0)));
  const totalDue = client.loans.reduce((sum, l) => sum + Number(l.amountDue || l.overdue || 0), 0);

  const legalEscalationRecommendation =
    riskScore >= 85 || topBucket >= 4 || totalDue > 100000
      ? "Legal pre-review recommended"
      : "No legal escalation now";

  const enrichmentConfidence = Math.min(100, Math.round(osintConfidence * 0.5 + contactabilityScore * 0.3 + responsivenessScore * 0.2));

  const evidenceStatus: IntelligenceEvidenceStatus =
    enrichmentConfidence >= 80 ? "verified" : enrichmentConfidence >= 60 ? "suspected" : "stale";

  return {
    identitySummary: `${client.name} has ${phonesCount} phone(s), ${addressCount} address(es), and ${actionsCount} timeline action(s).`,
    contactabilityScore,
    responsivenessScore,
    riskScore,
    behaviorType: ai.behaviorPrediction,
    preferredChannel,
    probabilityToPay: ai.paymentProbability,
    suggestedNextAction: ai.nextAction,
    followUpRecommendation: ai.paymentProbability >= 70 ? "Follow-up in 24h" : "Follow-up in 12h with escalation path",
    legalEscalationRecommendation,
    enrichmentConfidence,
    evidenceStatus,
    lastVerifiedAt: new Date().toISOString(),
  };
}
