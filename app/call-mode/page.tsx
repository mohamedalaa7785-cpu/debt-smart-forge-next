"use client";

import { useEffect, useState } from "react";
import CallCard from "@/components/CallCard";

/* =========================
   AI CALL MODE PAGE 🔥
========================= */
export default function CallModePage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const res = await fetch("/api/call-mode");
      const data = await res.json();

      setClients(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading)
    return (
      <div className="p-4 text-center">
        Loading Call Mode...
      </div>
    );

  return (
    <div className="p-4 space-y-3 max-w-xl mx-auto">

      <h1 className="text-lg font-bold">
        🔥 Smart Call Mode
      </h1>

      {clients.map((c) => (
        <CallCard key={c.id} client={c} />
      ))}
    </div>
  );
      }
