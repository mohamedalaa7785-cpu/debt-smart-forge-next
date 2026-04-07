import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import { getClientsForUser, getClientById } from "@/server/services/client.service";
import { requireUser } from "@/server/lib/auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const headerList = headers();
  const req = new NextRequest(new URL("/dashboard", "http://localhost"), { headers: headerList });
  
  const user = await requireUser(req);
  const baseClients = await getClientsForUser(user.id, user.role);
  
  const clients = await Promise.all(
    baseClients.slice(0, 20).map(async (c) => {
      const d = await getClientById(c.id);
      if (!d) return null;
      const totalDue = d.loans.reduce((acc, loan) => acc + Number(loan.overdue || 0), 0);
      const riskScore = d.loans[0]?.bucket ? d.loans[0].bucket * 20 : 20;
      const riskLabel = riskScore >= 80 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";
      return { client: c, summary: { totalAmountDue: totalDue, riskScore, riskLabel } };
    })
  );

  const validClients = clients.filter(Boolean) as any[];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">🗂 Portfolio Management</h1>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
            Role: {user.role}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Name</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Level</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Overdue</th>
              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {validClients.map((c) => (
              <tr key={c.client.id} className="hover:bg-blue-50/30 transition">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-900">{c.client.name}</p>
                  <p className="text-xs text-gray-400 font-medium">{c.client.company || "No Company"}</p>
                </td>
                <td className="px-6 py-4">
                  <RiskBadge label={c.summary.riskLabel} score={c.summary.riskScore} size="sm" />
                </td>
                <td className="px-6 py-4">
                  <p className="font-black text-gray-900">{formatCurrency(c.summary.totalAmountDue)}</p>
                </td>
                <td className="px-6 py-4">
                  <Link href={`/client/${c.client.id}`} className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest">
                    View Case →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {validClients.length === 0 && (
          <div className="p-12 text-center text-gray-400 text-sm font-medium">
            No clients found in your portfolio.
          </div>
        )}
      </div>
    </div>
  );
}
