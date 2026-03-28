"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  /* =========================
     DEBOUNCE SEARCH 🔥
  ========================= */
  useEffect(() => {
    const delay = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        return;
      }

      search(q);
    }, 400);

    return () => clearTimeout(delay);
  }, [q]);

  async function search(value: string) {
    try {
      setLoading(true);

      const res = await fetch(`/api/search?q=${value}`);
      const data = await res.json();

      setResults(data.data || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className="relative w-full">

      {/* INPUT */}
      <input
        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search by name, phone, company..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* RESULTS */}
      {(results.length > 0 || loading) && (
        <div className="absolute z-50 mt-2 w-full bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto">

          {loading && (
            <div className="p-2 text-sm text-gray-500">
              Searching...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-2 text-sm text-gray-400">
              No results
            </div>
          )}

          {results.map((c) => (
            <div
              key={c.id}
              className="p-2 text-sm cursor-pointer hover:bg-gray-100 flex flex-col"
              onClick={() => {
                router.push(`/client/${c.id}`);
                setResults([]);
                setQ("");
              }}
            >
              <span className="font-medium">{c.name}</span>

              <span className="text-xs text-gray-500">
                {c.company || "No company"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
        }
