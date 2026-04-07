import Link from "next/link";
import RiskBadge from "@/components/RiskBadge";
import { formatCurrency } from "@/lib/utils";
import { getClientsForUser, getClientById } from "@/server/services/client.service";
import { requireUser } from "@/server/lib/auth";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // We need to simulate a NextRequest for requireUser
  const headerList = headers();
  const req = new NextRequest(new URL("/", "http://localhost"), { headers: headerList });
  
  let user;
  try {
    user = await requireUser(req);
  } catch (e) {
    // Middleware should handle redirection, but as a fallback:
    return <div className="p-4 text-center">Unauthorized. Please login.</div>;
  }

  const baseClients = await getClientsForUser(user.id, user.role);
  
  // Enrich with summary data
  const clients = await Promise.all(
    baseClients.slice(0, 10).map(async (c) => {
      const d = await getClientById(c.id);
      if (!d) return null;
      
      const totalDue = d.loans.reduce((acc, loan) => acc + Number(loan.overdue || 0), 0);
      // Simplified risk for list
      const riskScore = d.loans[0]?.bucket ? d.loans[0].bucket * 20 : 20;
      const riskLabel = riskScore >= 80 ? "HIGH" : riskScore >= 40 ? "MEDIUM" : "LOW";
      
      return {
        client: c,
        summary: {
          totalAmountDue: totalDue,
          riskScore,
          riskLabel
        }
      };
    })
  );

  const validClients = clients.filter(Boolean) as any[];
  validClients.sort((a, b) => b.summary.totalAmountDue - a.summary.totalAmountDue);

  const totalClients = baseClients.length;
  const totalDue = validClients.reduce((sum, c) => sum + (c.summary?.totalAmountDue || 0), 0);
  const highRisk = validClients.filter((c) => c.summary?.riskLabel === "HIGH").length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center px-4 md:px-0">
        <h1 className="text-2xl font-bold text-gray-900">📊 Smart Dashboard</h1>
        <Link href="/add-client" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
          + Add Client
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 md:px-0">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Clients</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalClients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Overdue</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{formatCurrency(totalDue)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">High Risk</p>
          <p className="mt-2 text-3xl font-bold text-red-500">{highRisk}</p>
        </div>
      </div>

      {validClients[0] && (
        <div className="mx-4 md:px-0">
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase">Top Priority</p>
              <p className="text-lg font-bold text-gray-900">{validClients[0].client.name}</p>
            </div>
            <Link href={`/client/${validClients[0].client.id}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition">
              Open Case
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-3 px-4 md:px-0">
        <h2 className="text-lg font-semibold text-gray-900">Client List</h2>
        {validClients.length === 0 && (
          <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
            No clients assigned to you yet.
          </div>
        )}

        {validClients.map((c) => (
          <Link key={c.client.id} href={`/client/${c.client.id}`} className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="font-bold text-gray-900">{c.client.name}</p>
                <p className="text-sm text-gray-500">{c.client.company || "No Company"}</p>
              </div>
              <RiskBadge label={c.summary.riskLabel} score={c.summary.riskScore} size="sm" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-lg font-bold text-blue-600">{formatCurrency(c.summary.totalAmountDue)}</div>
              <div className="text-xs font-medium text-gray-400">Created {new Date(c.client.createdAt).toLocaleDateString()}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
