"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Client = {
  id: string;
  name: string;
  email?: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ---------------- LOAD ---------------- */
  async function loadClients() {
    setLoading(true);

    const res = await fetch(`/api/clients?search=${search}`);
    const json = await res.json();

    setClients(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, [search]);

  /* ---------------- SELECT ---------------- */
  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
    if (selected.length === clients.length) {
      setSelected([]);
    } else {
      setSelected(clients.map((c) => c.id));
    }
  }

  /* ---------------- BULK DELETE ---------------- */
  async function deleteSelected() {
    if (!confirm("Delete selected clients?")) return;

    await fetch("/api/clients/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: selected }),
    });

    setSelected([]);
    loadClients();
  }

  /* ---------------- BULK ASSIGN ---------------- */
  async function assignSelected() {
    const userId = prompt("Enter user ID to assign:");

    if (!userId) return;

    await fetch("/api/clients/assign", {
      method: "POST",
      body: JSON.stringify({ ids: selected, userId }),
    });

    setSelected([]);
    loadClients();
  }

  if (loading) return <p className="p-6">Loading clients...</p>;

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clients</h1>

        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-1 rounded"
        />
      </div>

      {/* BULK ACTIONS 🔥 */}
      {selected.length > 0 && (
        <div className="flex gap-2 p-3 bg-gray-100 rounded">
          <span className="text-sm font-semibold">
            {selected.length} selected
          </span>

          <button
            onClick={assignSelected}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
          >
            Assign
          </button>

          <button
            onClick={deleteSelected}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm"
          >
            Delete
          </button>
        </div>
      )}

      {/* LIST */}
      <div className="border rounded divide-y">
        {/* SELECT ALL */}
        <div className="p-3 bg-gray-50 flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.length === clients.length}
            onChange={selectAll}
          />
          <span className="text-sm text-gray-500">Select All</span>
        </div>

        {clients.map((c) => (
          <div
            key={c.id}
            className="p-4 flex justify-between items-center hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={() => toggleSelect(c.id)}
              />

              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="text-sm text-gray-500">{c.email}</p>
              </div>
            </div>

            <Link
              href={`/dashboard/clients/${c.id}`}
              className="text-blue-600 text-sm font-semibold"
            >
              View →
            </Link>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <p className="text-gray-400 text-center">No clients found</p>
      )}
    </div>
  );
}
