"use client";

import { useEffect, useState } from "react";
import MapView from "@/components/MapView";

type MapClient = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  priority: number;
  totalDue: number;
  bucket: number;
  phone?: string;
  address?: string;
};

export default function MapDashboardPage() {
  const [clients, setClients] = useState<MapClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/map", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (!payload?.success) {
          throw new Error(payload?.error || "Failed to load map clients");
        }
        setClients(payload.data || []);
      })
      .catch((e) => setError(e?.message || "Failed to load map clients"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading map data...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Field Map</h1>
      <p className="text-sm text-gray-600">Showing only clients accessible to your account.</p>
      <MapView clients={clients} />

      <div className="rounded-xl border bg-white">
        {clients.map((client) => (
          <div key={client.id} className="border-b last:border-b-0 p-3 text-sm">
            <div className="font-semibold">{client.name}</div>
            <div className="text-gray-600">Risk: {client.risk} | Priority: {client.priority} | Bucket: {client.bucket}</div>
            <div className="text-gray-500">{client.address || "No address"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
