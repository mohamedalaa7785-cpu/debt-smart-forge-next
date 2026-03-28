"use client";

import { useEffect, useState } from "react";
import { buildWhatsAppLink, formatCurrency } from "@/lib/utils";
import RiskBadge from "@/components/RiskBadge";

/* =========================
   PAGE
========================= */
export default function ClientPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/client/${params.id}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data</div>;

  const {
    client,
    phones,
    addresses,
    loans,
    summary,
    ai,
    osint,
    actions,
  } = data;

  const mainPhone = phones?.[0]?.phone;

  return (
    <div className="space-y-5">

      {/* =========================
          HEADER
      ========================= */}
      <div className="card-strong space-y-2">
        <h1 className="text-xl font-bold">{client.name}</h1>

        <div className="flex justify-between items-center">
          <RiskBadge
            label={summary.riskLabel}
            score={summary.riskScore}
          />

          <div className="text-right">
            <p className="text-sm text-gray-500">
              Total Due
            </p>
            <p className="font-bold">
              {formatCurrency(summary.totalAmountDue)}
            </p>
          </div>
        </div>
      </div>

      {/* =========================
          QUICK ACTIONS 🔥
      ========================= */}
      {mainPhone && (
        <div className="grid grid-cols-3 gap-2">

          <a
            href={`tel:${mainPhone}`}
            className="btn btn-success text-center"
          >
            📞 Call
          </a>

          <a
            href={buildWhatsAppLink(mainPhone)}
            className="btn btn-primary text-center"
          >
            💬 WhatsApp
          </a>

          <button
            onClick={() => navigator.clipboard.writeText(mainPhone)}
            className="btn btn-secondary"
          >
            Copy
          </button>
        </div>
      )}

      {/* =========================
          AI ANALYSIS 🧠
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">🧠 AI Decision</h2>

        <p className="text-sm">{ai.summary}</p>

        <div className="text-sm">
          🎯 Next: <b>{ai.nextAction}</b>
        </div>

        <div className="text-sm">
          ⚡ Tone: <b>{ai.tone}</b>
        </div>

        <div className="text-sm">
          📊 Probability: {ai.paymentProbability}%
        </div>

        {ai.redFlags?.length > 0 && (
          <div className="text-xs text-red-500">
            ⚠️ {ai.redFlags.join(" | ")}
          </div>
        )}
      </div>

      {/* =========================
          LOANS
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">💰 Loans</h2>

        {loans.map((l: any) => (
          <div
            key={l.id}
            className="border rounded-xl p-3 text-sm space-y-1"
          >
            <div className="flex justify-between">
              <span>{l.loanType}</span>
              <span>Bucket {l.bucket}</span>
            </div>

            <div>EMI: {formatCurrency(l.emi)}</div>
            <div>Due: {formatCurrency(l.amountDue)}</div>
          </div>
        ))}
      </div>

      {/* =========================
          PHONES
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">📞 Phones</h2>

        {phones.map((p: any) => (
          <div
            key={p.id}
            className="flex justify-between text-sm"
          >
            <span>{p.phone}</span>

            <a href={`tel:${p.phone}`} className="text-green-600">
              Call
            </a>
          </div>
        ))}
      </div>

      {/* =========================
          ADDRESSES + MAP LINK
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">📍 Addresses</h2>

        {addresses.map((a: any) => (
          <a
            key={a.id}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              a.address
            )}`}
            target="_blank"
            className="block text-sm text-blue-600"
          >
            📍 {a.address}
          </a>
        ))}
      </div>

      {/* =========================
          OSINT 🔍
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">🔍 OSINT</h2>

        <p className="text-sm">{osint?.summary}</p>

        {osint?.confidenceScore && (
          <div className="text-xs">
            Confidence: {osint.confidenceScore}%
          </div>
        )}

        {osint?.socialLinks && (
          <div className="text-xs break-all">
            {osint.socialLinks}
          </div>
        )}
      </div>

      {/* =========================
          ACTIONS TIMELINE
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">📅 Activity</h2>

        {actions.length === 0 && (
          <p className="text-sm text-gray-400">
            No activity yet
          </p>
        )}

        {actions.map((a: any) => (
          <div
            key={a.id}
            className="text-sm border-b pb-1"
          >
            <p>{a.actionType}</p>
            <p className="text-xs text-gray-500">
              {a.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
          }
