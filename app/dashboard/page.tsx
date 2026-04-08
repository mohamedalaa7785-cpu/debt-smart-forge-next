import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import {
  getClientsForUser,
  getClientById,
} from "@/server/services/client.service";
import { requireUser } from "@/server/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let user;

  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const baseClients = await getClientsForUser(user.id, user.role);

  const clients = await Promise.all(
    baseClients.slice(0, 20).map(async (c) => {
      const d = await getClientById(c.id);
      if (!d) return null;

      const totalDue = d.loans.reduce(
        (acc, loan) => acc + Number(loan.overdue || 0),
        0
      );

      const riskScore = d.loans[0]?.bucket ? d.loans[0].bucket * 20 : 20;

      const riskLabel =
        riskScore >= 80 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";

      return {
        client: c,
        summary: {
          totalAmountDue: totalDue,
          riskScore,
          riskLabel,
        },
      };
    })
  );

  const validClients = clients.filter(Boolean) as any[];

  /* ================= KPIs ================= */

  const totalClients = validClients.length;

  const totalOverdue = validClients.reduce(
    (acc, c) => acc + c.summary.totalAmountDue,
    0
  );

  const avgRisk =
    validClients.reduce((acc, c) => acc + c.summary.riskScore, 0) /
    (totalClients || 1);

  const highRiskCount = validClients.filter(
    (c) => c.summary.riskLabel === "HIGH"
  ).length;

  /* ================= UI ================= */

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          🧠 AI Portfolio Dashboard
        </h1>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
          Role: {user.role}
        </span>
      </div>

      {/* 🔥 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Clients</p>
          <p className="text-xl font-bold">{totalClients}</p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Total Overdue</p>
          <p className="text-xl font-bold">
            {formatCurrency(totalOverdue)}
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">Avg Risk</p>
          <p className="text-xl font-bold">{avgRisk.toFixed(0)}%</p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow">
          <p className="text-xs text-gray-400">High Risk</p>
          <p className="text-xl font-bold text-red-500">
            {highRiskCount}
          </p>
        </div>
      </div>

      {/* 🔥 ALERT */}
      {highRiskCount > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-semibold">
          ⚠️ You have {highRiskCount} high-risk clients that need attention
        </div>
      )}

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 text-xs font-bold text-gray-400">
                Client
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400">
                Risk
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400">
                Overdue
              </th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {validClients.map((c) => (
              <tr key={c.client.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-bold">{c.client.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.client.company || "No Company"}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <RiskBadge
                    label={c.summary.riskLabel}
                    score={c.summary.riskScore}
                    size="sm"
                  />
                </td>

                <td className="px-6 py-4 font-bold">
                  {formatCurrency(c.summary.totalAmountDue)}
                </td>

                <td className="px-6 py-4">
                  <Link
                    href={`/dashboard/clients/${c.client.id}`}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {validClients.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            No clients found
          </div>
        )}
      </div>
    </div>
  );
          }
