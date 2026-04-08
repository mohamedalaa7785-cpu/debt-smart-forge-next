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

export default function ClientProfilePage() {
  const { id } = useParams();

  const [data, setData] = useState<OSINT | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    async function load() {
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

    load();
  }, [id]);

  if (loading) return <p className="p-6">Loading...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;
  if (!data) return <p className="p-6">No data found</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Client Intelligence</h1>

      {/* SCORE */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">Risk Score</h2>
        <p className="text-3xl font-bold">{data.confidence}%</p>
      </div>

      {/* SUMMARY */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">AI Summary</h2>
        <p>{data.summary}</p>
      </div>

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
        <div className="grid grid-cols-2 gap-2">
          {data.imageMatches.map((img, i) => (
            <img key={i} src={img} className="rounded" />
          ))}
        </div>
      </div>
    </div>
  );
          }
