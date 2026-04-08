"use client";

import { useState } from "react";

type Result = {
  socialLinks: string[];
  webResults: string[];
  workplace: string[];
  imageMatches: string[];
  mapsResults: string[];
  summary: string;
  confidence: number;
};

export default function OSINTPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch() {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch("/api/osint", {
        method: "POST",
        body: JSON.stringify({ name: query }),
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">OSINT Intelligence</h1>

      {/* SEARCH */}
      <div className="flex gap-2">
        <input
          className="border p-2 w-full rounded"
          placeholder="Enter name or phone..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={handleSearch}
          className="bg-black text-white px-4 rounded"
        >
          Search
        </button>
      </div>

      {/* STATES */}
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* RESULT */}
      {data && (
        <div className="space-y-6">
          {/* SCORE */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Risk Score</h2>
            <p className="text-xl">{data.confidence}%</p>
          </div>

          {/* SUMMARY */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">AI Summary</h2>
            <p>{data.summary}</p>
          </div>

          {/* SOCIAL */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Social Links</h2>
            {data.socialLinks.map((l, i) => (
              <a key={i} href={l} target="_blank" className="block text-blue-500">
                {l}
              </a>
            ))}
          </div>

          {/* WORK */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Workplaces</h2>
            {data.workplace.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>

          {/* WEB */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Web Results</h2>
            {data.webResults.map((l, i) => (
              <a key={i} href={l} target="_blank" className="block text-blue-500">
                {l}
              </a>
            ))}
          </div>

          {/* MAPS */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Locations</h2>
            {data.mapsResults.map((m, i) => (
              <p key={i}>{m}</p>
            ))}
          </div>

          {/* IMAGES */}
          <div className="p-4 border rounded">
            <h2 className="font-bold">Image Matches</h2>
            <div className="grid grid-cols-3 gap-2">
              {data.imageMatches.map((img, i) => (
                <img key={i} src={img} className="rounded" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }
