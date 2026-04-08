"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type OSINT = {
  socialLinks: string[];
  webResults: string[];
  workplace: string[];
  imageMatches: string[];
  mapsResults: string[];
  summary: string;
  confidence: number;
};

type Fraud = {
  score: number;
  level: string;
  signals: string[];
  summary: string;
};

type Recommendation = {
  action: string;
  priority: string;
  reason: string;
};

function getRiskColor(score: number) {
  if (score > 70) return "text-red-500";
  if (score > 40) return "text-yellow-500";
  return "text-green-500";
}

export default function ClientProfilePage() {
  const { id } = useParams();

  const [data, setData] = useState<OSINT | null>(null);
  const [fraud, setFraud] = useState<Fraud | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- LOAD ALL ---------------- */
  async function loadAll() {
    try {
      const [osintRes, historyRes] = await Promise.all([
        fetch("/api/osint", {
          method: "POST",
          body: JSON.stringify({ clientId: id }),
        }),
        fetch(`/api/osint/history?clientId=${id}`),
      ]);

      const osintJson = await osintRes.json();
      const historyJson = await historyRes.json();

      if (!osintJson.success) throw new Error(osintJson.error);

      setData(osintJson.data);
      setHistory(historyJson.data || []);

      /* 🔥 FRAUD */
      const fraudRes = await fetch("/api/fraud", {
        method: "POST",
        body: JSON.stringify({ clientId: id }),
      });

      const fraudJson = await fraudRes.json();
      if (fraudJson.success) setFraud(fraudJson.data);

      /* 🔥 RECOMMENDATION */
      const recRes = await fetch("/api/recommendation", {
        method: "POST",
        body: JSON.stringify({ clientId: id }),
      });

      const recJson = await recRes.json();
      if (recJson.success) setRec(recJson.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- RUN OSINT ---------------- */
  async function runOSINT() {
    setRunning(true);

    try {
      await fetch("/api/osint", {
        method: "POST",
        body: JSON.stringify({ clientId: id }),
      });

      await loadAll();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadAll();
  }, [id]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!data) return <p className="p-6">No data</p>;

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Client Intelligence</h1>

        <button
          onClick={runOSINT}
          disabled={running}
          className="bg-black text-white px-4 py-2 rounded"
        >
          {running ? "Running..." : "Run OSINT"}
        </button>
      </div>

      {/* 🔥 SCORE */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">Risk Score</h2>
        <p className={`text-3xl font-bold ${getRiskColor(data.confidence)}`}>
          {data.confidence}%
        </p>
      </div>

      {/* 🔥 FRAUD */}
      {fraud && (
        <div className="border p-4 rounded">
          <h2 className="font-semibold">Fraud Analysis</h2>
          <p>Score: {fraud.score}</p>
          <p>Level: {fraud.level}</p>
          <p className="text-sm text-gray-500">{fraud.summary}</p>
        </div>
      )}

      {/* 🔥 RECOMMENDATION */}
      {rec && (
        <div className="border p-4 rounded bg-blue-50">
          <h2 className="font-semibold">AI Recommendation</h2>
          <p className="text-lg font-bold">{rec.action}</p>
          <p className="text-sm">{rec.reason}</p>
        </div>
      )}

      {/* SUMMARY */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">AI Summary</h2>
        <p>{data.summary}</p>
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border p-4 rounded">
          <h2 className="font-semibold">Social</h2>
          {data.socialLinks.map((l, i) => (
            <a key={i} href={l} className="block text-blue-500">
              {l}
            </a>
          ))}
        </div>

        <div className="border p-4 rounded">
          <h2 className="font-semibold">Work</h2>
          {data.workplace.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      </div>

      {/* HISTORY */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">History</h2>

        {history.map((h, i) => (
          <div key={i} className="border-b py-2 text-sm">
            <p>{new Date(h.createdAt).toLocaleString()}</p>
            <p>Score: {h.result?.confidence}</p>
          </div>
        ))}
      </div>
    </div>
  );
    }
