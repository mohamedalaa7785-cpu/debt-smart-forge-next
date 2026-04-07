"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import { isLoggedIn } from "@/lib/auth-store";
import { apiGet } from "@/lib/api-secure";

interface Client {
  id: string;
  name: string;
}

interface ClientFull {
  client: {
    id: string;
    name: string;
  };
  summary: {
    totalAmountDue: number;
    riskScore: number;
    riskLabel: "HIGH" | "MEDIUM" | "LOW";
  };
  ai: {
    nextAction: string;
    paymentProbability: number;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientFull[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const data = await apiGet("/api/clients");
        const baseClients: Client[] = data.data || [];

        const full = await Promise.all(
          baseClients.map(async (c) => {
            const d = await apiGet(`/api/client/${c.id}`);
            return d.data;
          })
        );

        full.sort((a, b) => {
          const p1 = a.summary.totalAmountDue * 0.5 + a.summary.riskScore * 10;
          const p2 = b.summary.totalAmountDue * 0.5 + b.summary.riskScore * 10;
          return p2 - p1;
        });

        setClients(full);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  if (loading) return <div className="p-4">Loading...</div>;

  const totalClients = clients.length;
  const totalDue = clients.reduce((sum, c) => sum + (c.summary?.totalAmountDue || 0), 0);
  const highRisk = clients.filter((c) => c.summary?.riskLabel === "HIGH").length;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="title">📊 Smart Dashboard</h1>
        <Link href="/add-client" className="btn btn-primary">+ Add</Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center">
          <p className="text-xs text-gray-500">Clients</p>
          <p className="font-bold">{totalClients}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">Total Due</p>
          <p className="font-bold">{formatCurrency(totalDue)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-500">High Risk</p>
          <p className="font-bold text-red-500">{highRisk}</p>
        </div>
      </div>

      {clients[0] && (
        <div className="card-strong flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Next Call</p>
            <p className="font-bold">{clients[0].client.name}</p>
          </div>
          <Link href={`/client/${clients[0].client.id}`} className="btn btn-danger">Open</Link>
        </div>
      )}

      <div className="space-y-3">
        {clients.length === 0 && <div className="card text-center text-gray-500">No clients yet</div>}

        {clients.map((c) => (
          <Link key={c.client.id} href={`/client/${c.client.id}`} className="card flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <p className="font-semibold">{c.client.name}</p>
              <RiskBadge label={c.summary.riskLabel} score={c.summary.riskScore} size="sm" />
            </div>
            <div className="text-sm">💰 {formatCurrency(c.summary.totalAmountDue)}</div>
            <div className="text-xs text-gray-500">{c.ai?.nextAction}</div>
            <div className="text-xs">Pay Chance: {c.ai?.paymentProbability}%</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
