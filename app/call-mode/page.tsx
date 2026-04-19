"use client";

import { useEffect, useState } from "react";
import CallCard from "@/components/CallCard";

type CallClient = {
  id: string;
  [key: string]: unknown;
};

export default function CallModePage() {
  const [clients, setClients] = useState<CallClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/call-mode", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.error || "Failed to load call mode clients");
        }

        setClients(Array.isArray(data.data) ? data.data : []);
      } catch (fetchError) {
        setClients([]);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load call mode clients");
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading Call Mode...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-3 p-4">
      <h1 className="text-lg font-bold">🔥 Smart Call Mode</h1>

      {clients.length === 0 ? (
        <p className="text-sm text-gray-500">No clients available for call mode.</p>
      ) : (
        clients.map((client) => <CallCard key={client.id} client={client} />)
      )}
    </div>
  );
}
