"use client";

import { useState, useMemo } from "react";

type Result = {
  socialLinks: string[];
  webResults: string[];
  workplace: string[];
  imageMatches: string[];
  mapsResults: string[];
  summary: string;
  confidence: number;
  riskLevel?: string;
  fraudFlags?: string[];
};

export default function OSINTPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/osint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim() }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) throw new Error(json.error || "OSINT request failed");

      setData(json.data);
    } catch (err: any) {
      setError(err?.message || "OSINT request failed");
    } finally {
      setLoading(false);
    }
  }

  const chartData = useMemo(() => {
    if (!data) return [];

    return [
      { name: "Social", value: data.socialLinks.length },
      { name: "Work", value: data.workplace.length },
      { name: "Web", value: data.webResults.length },
      { name: "Maps", value: data.mapsResults.length },
    ];
  }, [data]);

  const maxVal = Math.max(...chartData.map(d => d.value), 1);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">OSINT Intelligence</h1>

      <div className="flex gap-2">
        <input
          className="border p-2 w-full rounded"
          placeholder="Enter name or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          className="bg-black text-white px-4 rounded disabled:opacity-50"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {loading && <div className="p-4 border rounded animate-pulse">Searching OSINT data...</div>}
      {error && <p className="text-red-500">{error}</p>}

      {data && (
        <div className="space-y-6">
          <div className="p-4 border rounded">
            <h2 className="font-bold">Risk Score</h2>
            <p className="text-xl">{data.confidence}%</p>
            <p className="text-sm text-gray-600">Level: {data.riskLevel || "low"}</p>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold mb-4">Analysis Chart</h2>
            <div className="flex items-end gap-4 h-40 px-2">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-blue-500 rounded-t" 
                    style={{ height: `${(d.value / maxVal) * 100}%` }}
                  ></div>
                  <span className="text-xs font-medium">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">AI Summary</h2>
            <p>{data.summary}</p>
            <p className="text-xs text-gray-500 mt-2">Flags: {data.fraudFlags?.join(", ") || "None"}</p>
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">Social Links</h2>
            {data.socialLinks.length === 0 && <p>No data</p>}
            {data.socialLinks.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer" className="block text-blue-500">
                {l}
              </a>
            ))}
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">Workplaces</h2>
            {data.workplace.length === 0 && <p>No data</p>}
            {data.workplace.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">Web Results</h2>
            {data.webResults.length === 0 && <p>No data</p>}
            {data.webResults.map((l, i) => (
              <a key={i} href={l} target="_blank" rel="noreferrer" className="block text-blue-500">
                {l}
              </a>
            ))}
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">Locations</h2>
            {data.mapsResults.length === 0 && <p>No data</p>}
            {data.mapsResults.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>

          <div className="p-4 border rounded">
            <h2 className="font-bold">Image Matches</h2>
            {data.imageMatches.length === 0 && <p>No data</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {data.imageMatches.map((img, i) => (
                <img key={i} src={img} alt={`OSINT match ${i + 1}`} className="rounded" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
