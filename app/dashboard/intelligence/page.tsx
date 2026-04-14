"use client";

import { FormEvent, useState } from "react";

type FraudResult = {
  score: number;
  level: string;
  signals: string[];
  summary?: string;
};

type RecommendationResult = {
  action: string;
  reason: string;
  priority: string;
};

export default function IntelligencePage() {
  const [clientId, setClientId] = useState("");
  const [fraud, setFraud] = useState<FraudResult | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFraud(null);
    setRecommendation(null);

    try {
      const [fraudRes, recoRes] = await Promise.all([
        fetch("/api/fraud", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        }).then((r) => r.json()),
        fetch("/api/recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        }).then((r) => r.json()),
      ]);

      if (!fraudRes?.success) throw new Error(fraudRes?.error || "Fraud analysis failed");
      if (!recoRes?.success) throw new Error(recoRes?.error || "Recommendation failed");

      setFraud(fraudRes.data);
      setRecommendation(recoRes.data);
    } catch (e: any) {
      setError(e?.message || "Failed to run intelligence");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">AI Intelligence</h1>
      <p className="text-sm text-gray-600">Run fraud + recommendation engines for a specific client id.</p>

      <form onSubmit={handleRun} className="flex gap-2">
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          placeholder="Client UUID"
          className="border rounded px-3 py-2 w-full"
          required
        />
        <button disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-60" type="submit">
          {loading ? "Running..." : "Run"}
        </button>
      </form>

      {error ? <p className="text-red-600">{error}</p> : null}

      {fraud ? (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Fraud Analysis</h2>
          <p>Score: {fraud.score}</p>
          <p>Level: {fraud.level}</p>
          <p>Signals: {fraud.signals?.join(", ") || "None"}</p>
        </div>
      ) : null}

      {recommendation ? (
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold">Recommendation</h2>
          <p>Action: {recommendation.action}</p>
          <p>Priority: {recommendation.priority}</p>
          <p>Reason: {recommendation.reason}</p>
        </div>
      ) : null}
    </div>
  );
}
