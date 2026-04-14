export type Channel = "call" | "whatsapp" | "sms" | "email";

export interface ChannelAttempt {
  channel: Channel;
  delivered: boolean;
  responded: boolean;
  createdAt: string;
}

export interface ChannelEffectiveness {
  channel: Channel;
  deliveryRate: number;
  responseRate: number;
}

export function computeChannelEffectiveness(attempts: ChannelAttempt[]): ChannelEffectiveness[] {
  const byChannel = new Map<Channel, ChannelAttempt[]>();

  for (const attempt of attempts) {
    const entries = byChannel.get(attempt.channel) || [];
    entries.push(attempt);
    byChannel.set(attempt.channel, entries);
  }

  return Array.from(byChannel.entries()).map(([channel, entries]) => {
    const delivered = entries.filter((e) => e.delivered).length;
    const responded = entries.filter((e) => e.responded).length;
    const total = entries.length || 1;

    return {
      channel,
      deliveryRate: Math.round((delivered / total) * 100),
      responseRate: Math.round((responded / total) * 100),
    };
  });
}
