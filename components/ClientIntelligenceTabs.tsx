"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

type PhoneIntelRecord = {
  id: string;
  phone: string;
  fullName: string | null;
  country: string | null;
  carrier: string | null;
  whatsappAvailable: boolean;
  telegramAvailable: boolean;
  spamScore: number;
  confidenceScore: number;
  possibleAliases: string[];
  tags: string[];
  profileImage: string | null;
  updatedAt: string;
};

type SocialResult = { platform: string; title: string; link: string; snippet: string; confidence: number };

export default function ClientIntelligenceTabs({ clientId, clientName, primaryPhone }: { clientId: string; clientName: string; primaryPhone: string }) {
  const tabs = ["Overview", "OSINT", "Social Media", "Phone Intel", "Risk Analysis", "Activity Timeline"] as const;
  const [active, setActive] = useState<(typeof tabs)[number]>("Overview");
  const [phone, setPhone] = useState(primaryPhone || "");
  const [loading, setLoading] = useState(false);
  const [phoneResult, setPhoneResult] = useState<PhoneIntelRecord | null>(null);
  const [history, setHistory] = useState<PhoneIntelRecord[]>([]);
  const [social, setSocial] = useState<SocialResult[]>([]);
  const [risk, setRisk] = useState<any>(null);

  const whatsappUrl = useMemo(() => phoneResult ? `https://wa.me/${phoneResult.phone.replace(/\D/g, "")}` : "", [phoneResult]);

  async function lookupPhone(override?: string) {
    const target = (override ?? phone).trim();
    if (!target) return;
    setLoading(true);
    try {
      const res = await fetch("/api/phone-intelligence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, phone: target }) });
      const data = await res.json();
      if (res.ok) {
        setPhoneResult(data.result);
        setHistory(data.history || []);
      }
    } finally { setLoading(false); }
  }

  async function runSocial() {
    setLoading(true);
    try {
      const res = await fetch("/api/social-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, name: clientName, phone }) });
      const data = await res.json();
      if (res.ok) setSocial(data.results || []);
    } finally { setLoading(false); }
  }

  async function runRisk() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-risk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
      const data = await res.json();
      if (res.ok) setRisk(data);
    } finally { setLoading(false); }
  }

  return (
    <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 md:p-6 border border-slate-700">
      <div className="flex gap-2 overflow-x-auto pb-2">{tabs.map((tab) => <button key={tab} onClick={() => setActive(tab)} className={`px-3 py-2 text-sm rounded-lg whitespace-nowrap ${active === tab ? "bg-indigo-600" : "bg-slate-800"}`}>{tab}</button>)}</div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
        {(active === "Overview" || active === "Phone Intel") && <div className="grid md:grid-cols-3 gap-3">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Manual phone search" className="md:col-span-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700" />
          <div className="flex gap-2"><button onClick={() => lookupPhone()} className="px-3 py-2 rounded-lg bg-indigo-600">Phone Intelligence</button><button onClick={() => lookupPhone()} className="px-3 py-2 rounded-lg bg-emerald-600">Truecaller Lookup</button></div>
        </div>}
        {loading && <p className="text-sm text-slate-300">Searching intelligence...</p>}
        {phoneResult && (active === "Overview" || active === "Phone Intel") && <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
          <div className="flex justify-between gap-4"><div><p className="font-bold text-lg">{phoneResult.fullName || "Unknown"}</p><p>{phoneResult.phone}</p><p className="text-sm text-slate-400">{phoneResult.country} · {phoneResult.carrier}</p></div>{phoneResult.profileImage && <img src={phoneResult.profileImage} alt="profile" className="w-14 h-14 rounded-full" />}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs"><p>WA: {phoneResult.whatsappAvailable ? "Yes" : "No"}</p><p>TG: {phoneResult.telegramAvailable ? "Yes" : "No"}</p><p>Spam: {phoneResult.spamScore}</p><p>Confidence: {phoneResult.confidenceScore}</p></div>
          <p className="text-xs mt-2">Aliases: {phoneResult.possibleAliases.join(", ") || "-"}</p><p className="text-xs">Tags: {phoneResult.tags.join(", ") || "-"}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs"><a href={whatsappUrl} target="_blank" className="px-2 py-1 rounded bg-green-700">Open WhatsApp</a><button onClick={() => navigator.clipboard.writeText(phoneResult.phone)} className="px-2 py-1 rounded bg-slate-700">Copy number</button><button onClick={() => window.open(`https://t.me/${phoneResult.phone.replace(/\D/g, "")}`, "_blank")} className="px-2 py-1 rounded bg-blue-700">Send message</button><button className="px-2 py-1 rounded bg-indigo-700">Save intelligence report</button></div>
          <p className="text-xs text-slate-400 mt-2">Last updated: {new Date(phoneResult.updatedAt).toLocaleString()}</p>
        </div>}
        {(active === "Social Media" || active === "OSINT") && <div><button onClick={runSocial} className="px-3 py-2 rounded-lg bg-cyan-700 text-sm">Run Social Search</button><div className="mt-3 space-y-2">{social.map((s, i) => <a key={i} href={s.link} target="_blank" className="block p-3 rounded border border-slate-700 bg-slate-800"><p className="font-semibold">{s.platform}: {s.title}</p><p className="text-xs text-slate-400">{s.snippet}</p></a>)}</div></div>}
        {active === "Risk Analysis" && <div><button onClick={runRisk} className="px-3 py-2 rounded-lg bg-rose-700 text-sm">Generate AI Risk</button>{risk && <pre className="mt-3 p-3 rounded bg-slate-800 text-xs overflow-auto">{JSON.stringify(risk, null, 2)}</pre>}</div>}
        {active === "Activity Timeline" && <div className="text-sm text-slate-300">Phone search history ({history.length}) displayed in investigations context.</div>}
      </motion.div>
    </div>
  );
}
