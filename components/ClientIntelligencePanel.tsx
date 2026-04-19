"use client";

import { ChangeEvent, useState } from "react";

type SearchClientResult = { id: string; name: string; phone: string | null; rank: number };
type PhoneLookupData = { name: string | null; risk_score: number; spam: boolean; notes: string };
type ImageMatch = { client_id: string | null; similarity: number; image_url: string; risk_score: number };

export default function ClientIntelligencePanel() {
  const [query, setQuery] = useState("");
  const [phone, setPhone] = useState("");
  const [searchResults, setSearchResults] = useState<SearchClientResult[]>([]);
  const [phoneResult, setPhoneResult] = useState<PhoneLookupData | null>(null);
  const [imageMatches, setImageMatches] = useState<ImageMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search-clients?q=${encodeURIComponent(query)}&limit=10`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Search failed");
      setSearchResults(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function runPhoneLookup() {
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/phone-lookup?phone=${encodeURIComponent(phone)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || "Phone lookup failed");
      setPhoneResult(json.data || null);
    } catch (e: any) {
      setError(e?.message || "Phone lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const imageBase64 = String(reader.result || "");
      setLoading(true);
      setError(null);
      try {
        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64, title: file.name }),
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok || !uploadJson?.success) throw new Error(uploadJson?.error || "Upload failed");

        const searchRes = await fetch("/api/search-by-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: uploadJson.data?.imageUrl, limit: 5 }),
        });

        const searchJson = await searchRes.json();
        if (!searchRes.ok || !searchJson?.success) throw new Error(searchJson?.error || "Image search failed");

        setImageMatches(Array.isArray(searchJson.matches) ? searchJson.matches : []);
      } catch (e: any) {
        setError(e?.message || "Image pipeline failed");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
      <h2 className="text-lg font-bold">Client Intelligence</h2>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Smart Search</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name / partial / phone"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button onClick={runSearch} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Search</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500">Phone Intelligence</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-lg border px-3 py-2 text-sm"
          />
          <button onClick={runPhoneLookup} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Lookup</button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500">Image Similarity</p>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm" />
        </div>
      </div>

      {loading ? <p className="text-xs text-gray-500">Processing...</p> : null}
      {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}

      {phoneResult ? (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
          <p><span className="font-semibold">Name:</span> {phoneResult.name || "Unknown"}</p>
          <p><span className="font-semibold">Risk:</span> {phoneResult.risk_score}%</p>
          <p><span className="font-semibold">Spam:</span> {phoneResult.spam ? "Yes" : "No"}</p>
          <p><span className="font-semibold">Notes:</span> {phoneResult.notes}</p>
        </div>
      ) : null}

      {searchResults.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">Search Results</p>
          {searchResults.map((item) => (
            <div key={`${item.id}-${item.phone || "n/a"}`} className="rounded-lg border p-2 text-sm">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-gray-500">{item.phone || "No phone"} • rank {item.rank.toFixed(2)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {imageMatches.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500">Image Matches</p>
          {imageMatches.map((match, idx) => (
            <div key={`${match.client_id || "none"}-${idx}`} className="rounded-lg border p-2 text-sm flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Client: {match.client_id || "Unlinked"}</p>
                <p className="text-xs text-gray-500">Similarity: {(match.similarity * 100).toFixed(1)}% • Risk: {match.risk_score}</p>
              </div>
              {match.image_url ? <img src={match.image_url} alt="match" className="h-12 w-12 rounded object-cover" /> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
