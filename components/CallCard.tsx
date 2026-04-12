"use client";

import { formatCurrency, buildWhatsAppLink, normalizePhone } from "@/lib/utils";
import Link from "next/link";

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
      <div className="p-5 space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Link href={`/client/${client.id}`} className="text-lg font-bold text-gray-900 hover:text-blue-600 transition">
              {client.name}
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{formatCurrency(client.totalDue)}</span>
              <span className="text-[10px] font-bold text-gray-400">•</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{client.lastActionDays} Days Inactive</span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
            client.priority > 500 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          }`}>
            Priority: {Math.round(client.priority)}
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-xs text-gray-600 font-medium leading-relaxed italic">
            "{client.ai?.summary}"
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">
          <div className="flex items-center gap-1">
            <span className="text-blue-500">🎯</span> {client.ai?.nextAction}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-orange-500">⚡</span> {client.ai?.tone}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2">
          <a
            href={`tel:${client.phone}`}
            className="flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-green-100 transition active:scale-95"
          >
            📞 Call
          </a>

          <a
            href={buildWhatsAppLink(client.phone)}
            target="_blank"
            className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-100 transition active:scale-95"
          >
            💬 WA
          </a>

          <button
            onClick={handleLegalWhatsApp}
            className="flex items-center justify-center gap-2 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest border border-red-100 transition active:scale-95"
          >
            ⚖️ Legal
          </button>
        </div>
      </div>
    </div>
  );
}
