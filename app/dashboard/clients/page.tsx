"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Client = {
  id: string;
  name: string;
  email?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`, { cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Failed to load clients");
      }

      setClients(Array.isArray(json.data) ? json.data : []);
      setSelected((prev) => prev.filter((id) => json.data?.some((c: Client) => c.id === id)));
    } catch (loadError) {
      setClients([]);
      setSelected([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const hasClients = clients.length > 0;
  const allSelected = hasClients && selected.length === clients.length;

  const selectedText = useMemo(() => `${selected.length} selected`, [selected.length]);

  function toggleSelect(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  function selectAll() {
    if (!hasClients) return;
    setSelected(allSelected ? [] : clients.map((client) => client.id));
  }

  async function deleteSelected() {
    if (!selected.length || !window.confirm("Delete selected clients?")) return;

    const res = await fetch("/api/clients/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });

    if (!res.ok) {
      setError("Failed to delete selected clients");
      return;
    }

    setSelected([]);
    void loadClients();
  }

  async function assignSelected() {
    if (!selected.length) return;

    const ownerId = window.prompt("Enter owner user ID:");
    if (!ownerId?.trim()) return;

    const res = await fetch("/api/clients/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected, ownerId: ownerId.trim() }),
    });

    if (!res.ok) {
      setError("Failed to assign selected clients");
      return;
    }

    setSelected([]);
    void loadClients();
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Clients</h1>

        <input
          placeholder="Search by name..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="rounded border px-3 py-1"
          aria-label="Search clients"
        />
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {selected.length > 0 && (
        <div className="flex items-center gap-2 rounded bg-gray-100 p-3">
          <span className="text-sm font-semibold">{selectedText}</span>

          <button onClick={assignSelected} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
            Assign
          </button>

          <button onClick={deleteSelected} className="rounded bg-red-600 px-3 py-1 text-sm text-white">
            Delete
          </button>
        </div>
      )}

      <div className="divide-y rounded border">
        <div className="flex items-center gap-2 bg-gray-50 p-3">
          <input type="checkbox" checked={allSelected} onChange={selectAll} disabled={!hasClients || loading} />
          <span className="text-sm text-gray-500">Select All</span>
        </div>

        {loading ? (
          <p className="p-6 text-center text-sm text-gray-500">Loading clients...</p>
        ) : hasClients ? (
          clients.map((client) => (
            <div key={client.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(client.id)}
                  onChange={() => toggleSelect(client.id)}
                />

                <div>
                  <p className="font-semibold">{client.name}</p>
                  <p className="text-sm text-gray-500">{client.email || "-"}</p>
                </div>
              </div>

              <Link href={`/client/${client.id}`} className="text-sm font-semibold text-blue-600">
                View →
              </Link>
            </div>
          ))
        ) : (
          <p className="p-6 text-center text-gray-400">No clients found</p>
        )}
      </div>
    </div>
  );
}
