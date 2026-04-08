import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import { getClientsForUser, getClientById } from "@/server/services/client.service";
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🗂 Portfolio Management</h1>
        <div className="flex gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">
            Role: {user.role}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Client Name
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Risk Level
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Total Overdue
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {validClients.map((c) => (
              <tr key={c.client.id} className="transition hover:bg-blue-50/30">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{c.client.name}</p>
                  <p className="text-xs font-medium text-gray-400">
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

                <td className="px-6 py-4">
                  <p className="font-black text-gray-900">
                    {formatCurrency(c.summary.totalAmountDue)}
                  </p>
                </td>

                <td className="px-6 py-4">
                  <Link
                    href={`/client/${c.client.id}`}
                    className="text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-800"
                  >
                    View Case →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {validClients.length === 0 && (
          <div className="p-12 text-center text-sm font-medium text-gray-400">
            No clients found in your portfolio.
          </div>
        )}
      </div>
    </div>
  );
      }
