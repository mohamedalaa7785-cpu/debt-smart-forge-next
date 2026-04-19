"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  customerId: string | null;
  portfolioType: string;
  domainType: string;
  phones: string[];
};

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [portfolio, setPortfolio] = useState<"" | "ACTIVE" | "WRITEOFF">("");
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
    const timer = window.setTimeout(() => {
      if (q.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      void search(q.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [q, sort, portfolio]);

  const hasQuery = useMemo(() => q.trim().length >= 2, [q]);

  async function search(value: string) {
    try {
      setLoading(true);
      setShowResults(true);
      setRequestError(null);

      const params = new URLSearchParams({ q: value, sort, limit: "20" });
      if (portfolio) params.set("portfolio", portfolio);

      const res = await fetch(`/api/search?${params.toString()}`);
      const json = (await res.json()) as { success?: boolean; data?: SearchResult[] };

      if (!res.ok || !json.success) {
        setResults([]);
        return;
      }

      setResults(Array.isArray(json.data) ? json.data : []);
    } catch {
      setResults([]);
      setRequestError("Search is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="space-y-2">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm font-medium shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            placeholder="Search by name, phone, customer ID, email, company..."
            value={q}
            onFocus={() => hasQuery && setShowResults(true)}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading ? (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <select
            className="rounded-xl border border-gray-200 px-2 py-1 text-xs"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>

          <select
            className="rounded-xl border border-gray-200 px-2 py-1 text-xs"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value as "" | "ACTIVE" | "WRITEOFF")}
          >
            <option value="">All portfolios</option>
            <option value="ACTIVE">Active</option>
            <option value="WRITEOFF">Writeoff</option>
          </select>
        </div>
      </div>

      {showResults && hasQuery ? (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-gray-100 bg-white py-2 shadow-xl">
          {loading && results.length === 0 ? (
            <div className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-gray-400">
              Searching clients...
            </div>
          ) : null}

          {requestError ? (
            <div className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-red-500">
              {requestError}
            </div>
          ) : null}

          {!loading && results.length === 0 && !requestError ? (
            <div className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-gray-400">
              No matching clients found.
            </div>
          ) : null}

          {results.map((client) => (
            <button
              key={client.id}
              className="group flex w-full items-center justify-between px-6 py-3 text-left transition hover:bg-blue-50"
              onClick={() => {
                router.push(`/client/${client.id}`);
                setShowResults(false);
                setQ("");
              }}
            >
              <div className="flex flex-col gap-1">
                <span className="font-bold text-gray-900 transition group-hover:text-blue-700">{client.name}</span>
                <span className="text-xs text-gray-500">
                  {(client.customerId && `ID: ${client.customerId}`) || client.email || client.company || "No identifier"}
                </span>
                {client.phones.length > 0 ? (
                  <span className="text-[11px] text-gray-400">{client.phones.slice(0, 2).join(" • ")}</span>
                ) : null}
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-blue-600 opacity-0 transition group-hover:opacity-100">
                Open →
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
