import { calculatePriority } from "@/server/services/risk.service";

export function computePriority(client: any) {
  return calculatePriority({
    amountDue: client.summary.totalAmountDue,
    riskScore: client.summary.riskScore,
    lastActionDays: client.summary.lastActionDays,
  });
}

export function sortClientsByPriority(clients: any[]) {
  return clients
    .map((c) => ({
      ...c,
      priority: computePriority(c),
    }))
    .sort((a, b) => b.priority - a.priority);
}
