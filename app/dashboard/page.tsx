"use client";

import SearchBar from "@/components/SearchBar";
import { useEffect, useState } from "react";
import RiskBadge from "@/components/RiskBadge";

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.data || []);
      });
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-xl mx-auto">

      <h1 className="text-xl font-bold">
        Dashboard
      </h1>

      {/* SEARCH */}
      <SearchBar />

      {/* CLIENT LIST */}
      <div className="space-y-2">
        {clients.map((c) => (
          <div
            key={c.id}
            className="border rounded-lg p-3"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {c.name}
              </span>

              <RiskBadge
                label={c.riskLabel || "LOW"}
                score={c.riskScore || 0}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
