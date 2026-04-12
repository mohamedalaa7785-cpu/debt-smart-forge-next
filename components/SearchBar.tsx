"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (q.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      search(q);
    }, 300);

    return () => clearTimeout(delay);
  }, [q]);

  async function search(value: string) {
    try {
      setLoading(true);
      setShowResults(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data.data || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-sm"
          placeholder="Search clients by name, phone, or company..."
          value={q}
          onFocus={() => q.length >= 2 && setShowResults(true)}
          onChange={(e) => setQ(e.target.value)}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {showResults && (q.length >= 2) && (
        <div className="absolute z-50 mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-xl max-h-80 overflow-y-auto overflow-x-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {loading && results.length === 0 && (
            <div className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
              Scanning database...
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">
              No matching records found.
            </div>
          )}

          {results.map((c) => (
            <button
              key={c.id}
              className="w-full px-6 py-3 text-left hover:bg-blue-50 transition flex items-center justify-between group"
              onClick={() => {
                router.push(`/client/${c.id}`);
                setShowResults(false);
                setQ("");
              }}
            >
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 group-hover:text-blue-700 transition">{c.name}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {c.company || "Individual Portfolio"}
                </span>
              </div>
              <span className="text-xs font-black text-blue-600 opacity-0 group-hover:opacity-100 transition uppercase tracking-widest">
                Open Case →
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
