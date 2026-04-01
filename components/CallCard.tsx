"use client";

import { formatCurrency, buildWhatsAppLink, normalizePhone } from "@/lib/utils";

const FAB_LEGAL_TEMPLATE = `
FAB Bank Legal Notice:
Dear {name},
This is a formal legal notification regarding your outstanding debt of EGP {amount}.
Please be advised that failure to settle this amount within 24 hours will result in
immediate legal proceedings and reporting to the Central Bank of Egypt (CBE).
To avoid legal action, please contact us immediately or visit your nearest branch.
`;

export default function CallCard({ client }: any) {
  const handleLegalWhatsApp = () => {
    const message = FAB_LEGAL_TEMPLATE
      .replace("{name}", client.name)
      .replace("{amount}", Math.round(client.totalDue).toString());
    
    const clean = normalizePhone(client.phone);
    const text = encodeURIComponent(message);
    window.open(`https://wa.me/${clean}?text=${text}`, "_blank");
  };

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

        <button
          onClick={handleLegalWhatsApp}
          className="btn btn-warning flex-1 text-center"
          title="Send FAB Bank Legal Notice"
        >
          ⚖️ Legal
        </button>

      </div>
    </div>
  );
}
