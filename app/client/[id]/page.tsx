import { requireUser } from "@/server/lib/auth";
import { getClientById } from "@/server/services/client.service";
import { calculateRisk } from "@/server/services/risk.service";
import { analyzeClient, generateCallScript } from "@/server/services/ai.service";
import { decideAction } from "@/server/core/decision.engine";
import { formatCurrency, buildWhatsAppLink } from "@/lib/utils";
import RiskBadge from "@/components/RiskBadge";
import ActionButtons from "@/components/ActionButtons";
import Timeline from "@/components/Timeline";
import OSINTPanel from "@/components/OSINTPanel";
import ClientAutoRefresh from "@/components/ClientAutoRefresh";

export const dynamic = "force-dynamic";

function isImageUrl(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) && /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(normalized);
}

export default async function ClientPage({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const data = await getClientById(params.id, user.id, user.role);

  if (!data) return <div className="p-8 text-center">Client not found</div>;

  const phones = data.phones || [];
  const addresses = data.addresses || [];
  const loans = data.loans || [];
  const osint = data.osint || null;

  const totalDue = loans.reduce((sum, l) => sum + Number(l.amountDue || l.overdue || 0), 0);
  
  const riskInput = {
    bucket: loans[0]?.bucket ?? undefined,
    amountDue: totalDue,
    hasPhone: phones.length > 0,
    hasAddress: addresses.length > 0,
    hasLoans: loans.length > 0,
    hasOsint: !!osint,
    lastActionDays: 0,
    aiSignalsScore: 50
  };
  const risk = calculateRisk(riskInput);

  const aiInput = {
    clientName: data.name || "Unknown",
    totalAmountDue: totalDue,
    riskScore: risk.score,
    riskLabel: risk.label,
    phonesCount: phones.length,
    addressesCount: addresses.length,
    loansCount: loans.length,
    osintConfidence: Number(osint?.confidenceScore || 0),
    osintSummary: osint?.summary || ""
  };
  const aiResult = await analyzeClient(aiInput);
  const script = await generateCallScript(aiInput, aiResult);
  const decision = decideAction({
    risk,
    ai: aiResult,
    osintConfidence: Number(osint?.confidenceScore || 0),
    lastActionDays: 0,
    totalDue
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <ClientAutoRefresh intervalSec={20} />

      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
            <p className="text-gray-500 font-medium">{data.company || "Individual Portfolio"}</p>
            {data.branch && <p className="text-xs text-gray-400 font-semibold">Branch: {data.branch}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Overdue</p>
              <p className="text-2xl font-black text-blue-600">{formatCurrency(totalDue)}</p>
            </div>
            <RiskBadge label={risk.label} score={risk.score} />
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-50">
          <ActionButtons 
            clientId={params.id} 
            phones={phones.map(p => p.phone)} 
            script={script}
          />
        </div>

        {data.referral && (
          <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Referral</p>
            {isImageUrl(data.referral) ? (
              <a href={data.referral} target="_blank" rel="noreferrer" className="block mt-2">
                <img
                  src={data.referral}
                  alt="Referral attachment"
                  className="max-h-64 rounded-lg border border-amber-200"
                />
              </a>
            ) : (
              <p className="text-sm text-amber-900 whitespace-pre-wrap mt-1">{data.referral}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: AI & Decisions */}
        <div className="md:col-span-2 space-y-8">
          {/* AI Decision Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <h2 className="text-lg font-bold">AI Collection Strategy</h2>
            </div>
            <p className="text-blue-50 text-lg font-medium leading-relaxed mb-6">
              "{aiResult.summary}"
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-blue-200 font-bold uppercase">Next Action</p>
                <p className="text-lg font-black">{decision.action}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-xs text-blue-200 font-bold uppercase">Tone</p>
                <p className="text-lg font-black capitalize">{aiResult.tone}</p>
              </div>
            </div>
          </div>

          {/* Script Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📜</span> Suggested Script (Arabic)
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Opening</p>
                <p className="text-gray-800 leading-relaxed">{script.opening}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase mb-1">Main Body</p>
                <p className="text-gray-800 leading-relaxed">{script.mainBody}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>📅</span> Activity Timeline
            </h2>
            <Timeline actions={data.actions || []} />
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="space-y-8">
          {/* Loans Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">💰 Loans</h2>
            <div className="space-y-3">
              {loans.map((l: any) => (
                <div key={l.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-2">
                    <span>{l.loanType} {l.loanNumber ? `#${l.loanNumber}` : ""}</span>
                    <span>Bucket {l.bucket} {l.cycle ? `| CYL ${l.cycle}` : ""}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <p>Org: <span className="font-semibold text-gray-800">{l.organization || "-"}</span></p>
                    <p>Will legal: <span className="font-semibold text-gray-800">{l.willLegal ? "Yes" : "No"}</span></p>
                    <p>Referral: <span className="font-semibold text-gray-800">{l.referralDate ? new Date(l.referralDate).toLocaleDateString() : "-"}</span></p>
                    <p>Collector %: <span className="font-semibold text-gray-800">{l.collectorPercentage ?? "-"}</span></p>
                  </div>
                  <div className="flex justify-between items-end gap-2">
                    <div>
                      <p className="text-xs text-gray-500">EMI</p>
                      <p className="font-bold">{formatCurrency(l.emi)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount Due</p>
                      <p className="font-bold text-amber-700">{formatCurrency(l.amountDue || 0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Overdue</p>
                      <p className="font-black text-red-600">{formatCurrency(l.overdue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* OSINT Panel */}
          <OSINTPanel osint={osint} />

          {/* Contact Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Location</h2>
            <div className="space-y-3">
              {addresses.map((a: any) => (
                <a 
                  key={a.id} 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                  target="_blank"
                  className="block p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-300 transition"
                >
                  <p className="text-sm text-gray-700 font-medium">{a.address}</p>
                  <p className="text-xs text-blue-600 mt-1 font-bold">View on Google Maps →</p>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
