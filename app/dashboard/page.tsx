"use client";

import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";

/* =========================
   TYPES
========================= */

type Client = {
  id: string;
  name: string;
  company?: string;
  overdue: number;
  riskScore: number;
  riskLabel: string;
};

type DashboardStats = {
  totalClients: number;
  totalOverdue: number;
  avgRisk: number;
  highRisk: number;
};

/* =========================
   PAGE
========================= */

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalOverdue: 0,
    avgRisk: 0,
    highRisk: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/clients", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([clientsRes, dashboardRes]) => {
        const formatted: Client[] =
          clientsRes.data?.map((c: any) => {
            const score = Number(c.riskScore ?? 0);

            return {
              id: c.id,
              name: c.name,
              company: c.company,
              overdue: Number(c.overdue ?? 0),
              riskScore: score,
              riskLabel:
                score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW",
            };
          }) || [];

        setClients(formatted);

        if (dashboardRes?.success && dashboardRes?.data) {
          setStats({
            totalClients: Number(dashboardRes.data.totalClients || 0),
            totalOverdue: Number(dashboardRes.data.totalOverdue || 0),
            avgRisk: Number(dashboardRes.data.avgRisk || 0),
            highRisk: Number(dashboardRes.data.highRisk || 0),
          });
        } else {
          const totalOverdueFallback = formatted.reduce(
            (acc: number, c: Client) => acc + c.overdue,
            0
          );
          const avgRiskFallback =
            formatted.reduce(
              (acc: number, c: Client) => acc + c.riskScore,
              0
            ) / (formatted.length || 1);
          const highRiskFallback = formatted.filter(
            (c: Client) => c.riskScore >= 70
          ).length;

          setStats({
            totalClients: formatted.length,
            totalOverdue: totalOverdueFallback,
            avgRisk: avgRiskFallback,
            highRisk: highRiskFallback,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  /* ================= KPIs ================= */

  const totalClients = stats.totalClients || clients.length;
  const totalOverdue =
    stats.totalOverdue ||
    clients.reduce((acc, c) => acc + c.overdue, 0);
  const avgRisk =
    stats.avgRisk ||
    clients.reduce((acc, c) => acc + c.riskScore, 0) /
      (clients.length || 1);
  const highRiskCount =
    stats.highRisk ||
    clients.filter((c) => c.riskScore >= 70).length;

  /* ================= CHART ================= */

  const chartData = [
    {
      name: "Low",
      value: clients.filter((c) => c.riskScore < 40).length,
    },
    {
      name: "Medium",
      value: clients.filter(
        (c) => c.riskScore >= 40 && c.riskScore < 70
      ).length,
    },
    {
      name: "High",
      value: clients.filter((c) => c.riskScore >= 70).length,
    },
  ];

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* HEADER */}
      <h1 className="text-2xl font-bold">
        🧠 AI Portfolio Dashboard
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Clients</p>
          <p className="text-xl font-bold">{totalClients}</p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Overdue</p>
          <p className="text-xl font-bold">
            {formatCurrency(totalOverdue)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Avg Risk</p>
          <p className="text-xl font-bold">
            {avgRisk.toFixed(0)}%
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">High Risk</p>
          <p className="text-xl font-bold text-red-500">
            {highRiskCount}
          </p>
        </div>
      </div>

      {/* 🔥 CHART */}
      <div className="p-4 bg-white rounded-xl border shadow">
        <h2 className="font-bold mb-2">Risk Distribution</h2>

        <LineChart width={400} height={200} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" />
        </LineChart>
      </div>

      {/* TABLE */}
      <div className="bg-white border rounded-xl">
        {clients.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/clients/${c.id}`}
            className="block p-4 border-b hover:bg-gray-50"
          >
            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold">{c.name}</p>
                <p className="text-xs text-gray-400">
                  {c.company}
                </p>
              </div>

              <RiskBadge
                score={c.riskScore}
                label={c.riskLabel}
                size="sm"
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
