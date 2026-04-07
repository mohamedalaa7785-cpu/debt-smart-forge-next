"use client";

import { useState } from "react";
import { buildWhatsAppLink } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  clientId: string;
  phones: string[];
  script?: {
    opening: string;
    mainBody: string;
    closing: string;
    whatsappMessage: string;
  };
}

export default function ActionButtons({ clientId, phones, script }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activePhone, setActivePhone] = useState(phones[0] || "");

  if (!phones.length) return null;

  async function logAction(type: string, note?: string) {
    try {
      setLoading(true);
      await fetch("/api/actions", {
        method: "POST",
        body: JSON.stringify({
          clientId,
          actionType: type,
          note: note || `Action performed on ${activePhone}`,
        }),
      });
      router.refresh();
    } catch (err) {
      console.error("Action log error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Active Contact</label>
          <select 
            value={activePhone} 
            onChange={(e) => setActivePhone(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition"
          >
            {phones.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex gap-2 flex-1 md:flex-[2]">
          <a
            href={`tel:${activePhone}`}
            onClick={() => logAction("CALL")}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <span className="text-xl">📞</span> Call Now
          </a>

          <a
            href={buildWhatsAppLink(activePhone, script?.whatsappMessage)}
            target="_blank"
            onClick={() => logAction("WHATSAPP")}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <span className="text-xl">💬</span> WhatsApp
          </a>

          <button
            onClick={() => {
              navigator.clipboard.writeText(activePhone);
              logAction("COPY", "Copied phone number to clipboard");
            }}
            className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition active:scale-95"
          >
            📋
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        <button 
          onClick={() => logAction("VISIT", "Field visit planned")}
          className="whitespace-nowrap px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold border border-indigo-100 hover:bg-indigo-100 transition"
        >
          📍 Field Visit
        </button>
        <button 
          onClick={() => logAction("FOLLOW", "Scheduled follow-up")}
          className="whitespace-nowrap px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-bold border border-orange-100 hover:bg-orange-100 transition"
        >
          ⏰ Follow-up
        </button>
        <button 
          onClick={() => logAction("LEGAL", "Escalated to legal")}
          className="whitespace-nowrap px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold border border-red-100 hover:bg-red-100 transition"
        >
          ⚖️ Legal Escalation
        </button>
      </div>
    </div>
  );
}
