export type WorkflowChannel = "call" | "whatsapp" | "sms" | "email";

export interface WorkflowTask {
  type: "follow_up" | "reminder" | "escalation" | "retry";
  runAt: string;
  channel: WorkflowChannel;
  reason: string;
}

export function buildWorkflowPlan(params: {
  probabilityToPay: number;
  riskScore: number;
  lastInteractionHours: number;
}): WorkflowTask[] {
  const { probabilityToPay, riskScore, lastInteractionHours } = params;

  if (riskScore >= 85) {
    return [
      {
        type: "escalation",
        runAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        channel: "call",
        reason: "High risk profile requires escalation",
      },
    ];
  }

  const delay = probabilityToPay >= 70 ? 24 : 12;
  const channel: WorkflowChannel = probabilityToPay >= 70 ? "whatsapp" : "call";

  return [
    {
      type: "follow_up",
      runAt: new Date(Date.now() + delay * 60 * 60 * 1000).toISOString(),
      channel,
      reason: `Auto follow-up after ${lastInteractionHours}h inactivity`,
    },
    {
      type: "retry",
      runAt: new Date(Date.now() + (delay + 24) * 60 * 60 * 1000).toISOString(),
      channel: "sms",
      reason: "No response after follow-up",
    },
  ];
}
