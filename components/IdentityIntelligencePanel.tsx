"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

type Match = { platform: string; profileUrl: string; confidence_score: number; matched_fields: string[]; reasoning: string[]; risk_level: string };

export default function IdentityIntelligencePanel({ clientId }: { clientId: string }) {
  const [data, setData] = useState<{ matches: Match[]; summary?: any } | null>(null);

  useEffect(() => {
    fetch("/api/identity-match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ matches: [] }));
  }, [clientId]);

  const color = (score: number) => (score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600");

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-700 p-6 space-y-4">
      <h3 className="text-lg font-bold">Identity Matches</h3>
      <div className="space-y-3">
        {(data?.matches || []).map((m, i) => (
          <div key={`${m.profileUrl}-${i}`} className="rounded-xl border p-3">
            <div className="flex justify-between items-center">
              <a href={m.profileUrl} target="_blank" className="font-semibold text-blue-600">{m.platform}</a>
              <span className={`font-bold ${color(m.confidence_score)}`}>{m.confidence_score}%</span>
            </div>
            <p className="text-xs mt-1">Matched: {m.matched_fields.join(", ") || "none"}</p>
            <p className="text-xs text-gray-500">AI reasoning: {m.reasoning.join("; ") || "No reasoning"}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 p-3">
        <h4 className="font-semibold">Social Intelligence</h4>
        <p className="text-sm text-gray-600 dark:text-zinc-300">{data?.summary?.summary || "No AI summary yet."}</p>
      </div>
      <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 p-3">
        <h4 className="font-semibold">Risk Analysis</h4>
        <p className="text-sm">Risk: {data?.summary?.customer_risk || "unknown"}</p>
      </div>
    </motion.div>
  );
}
