"use client";

import { formatCurrency, buildWhatsAppLink } from "@/lib/utils";

export default function CallCard({ client }: any) {
  return (
    <div className="card-strong space-y-2 border-l-4 border-red-500">

      {/* NAME */}
      <h2 className="font-bold">
        {client.name}
      </h2>

      {/* FINANCIAL */}
      <div className="text-sm">
        💰 {formatCurrency(client.totalDue)}
      </div>

      {/* AI */}
      <div className="text-xs bg-gray-100 p-2 rounded">
        {client.ai?.summary}
      </div>

      <div className="text-xs">
        🎯 {client.ai?.nextAction}
      </div>

      <div className="text-xs">
        ⚡ Tone: {client.ai?.tone}
      </div>

      {/* ACTIONS */}
      <div className="flex gap-2 pt-1">

        <a
          href={`tel:${client.phone}`}
          className="btn btn-success flex-1 text-center"
        >
          📞 Call
        </a>

        <a
          href={buildWhatsAppLink(client.phone)}
          target="_blank"
          className="btn btn-primary flex-1 text-center"
        >
          💬 WA
        </a>

      </div>
    </div>
  );
}
