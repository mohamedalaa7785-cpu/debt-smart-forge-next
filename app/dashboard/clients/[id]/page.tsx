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

function getRiskColor(score: number) {
  if (score > 70) return "text-red-500";
  if (score > 40) return "text-yellow-500";
  return "text-green-500";
}

export default function ClientProfilePage() {
  const { id } = useParams();

  const [data, setData] = useState<OSINT | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- LOAD DATA ---------------- */
  async function loadOSINT() {
    try {
      const res = await fetch("/api/osint", {
        method: "POST",
        body: JSON.stringify({ clientId: id }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- LOAD HISTORY ---------------- */
  async function loadHistory() {
    try {
      const res = await fetch(`/api/osint/history?clientId=${id}`);
      const json = await res.json();
      setHistory(json.data || []);
    } catch (err) {
      console.error(err);
    }
  }

  /* ---------------- RUN OSINT ---------------- */
  async function runOSINT() {
    setRunning(true);

    try {
      const res = await fetch("/api/osint", {
        method: "POST",
        body: JSON.stringify({ clientId: id }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setData(json.data);
      await loadHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!id) return;
    loadOSINT();
    loadHistory();
  }, [id]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!data) return <p className="p-6">No data found</p>;

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

      {/* SCORE */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">Risk Score</h2>
        <p className={`text-3xl font-bold ${getRiskColor(data.confidence)}`}>
          {data.confidence}%
        </p>
      </div>

      {/* SUMMARY */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">AI Summary</h2>
        <p>{data.summary}</p>
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* SOCIAL */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold">Social Links</h2>
          {data.socialLinks.length === 0 && <p>No data</p>}
          {data.socialLinks.map((l, i) => (
            <a key={i} href={l} target="_blank" className="block text-blue-500">
              {l}
            </a>
          ))}
        </div>

        {/* WORK */}
        <div className="border p-4 rounded">
          <h2 className="font-semibold">Workplaces</h2>
          {data.workplace.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      </div>

      {/* MAPS */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">Locations</h2>
        {data.mapsResults.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>

      {/* IMAGES */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">Image Matches</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {data.imageMatches.map((img, i) => (
            <img key={i} src={img} className="rounded" />
          ))}
        </div>
      </div>

      {/* HISTORY 🔥 */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold mb-2">OSINT History</h2>

        {history.length === 0 && <p>No history</p>}

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
