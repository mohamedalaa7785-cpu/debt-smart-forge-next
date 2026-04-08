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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => {
        setClients(d.data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-6">Loading clients...</p>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Clients</h1>

      {clients.map((c) => (
        <Link
          key={c.id}
          href={`/dashboard/clients/${c.id}`}
          className="block p-4 border rounded hover:bg-gray-100"
        >
          <h2 className="font-semibold">{c.name}</h2>
          <p className="text-sm text-gray-500">{c.email}</p>
        </Link>
      ))}
    </div>
  );
      }
