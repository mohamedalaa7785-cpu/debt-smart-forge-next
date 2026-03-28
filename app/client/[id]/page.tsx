"use client";

import { useEffect, useState } from "react";
import {
  buildWhatsAppLink,
  formatCurrency,
} from "@/lib/utils";
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

  /* =========================
     FETCH
  ========================= */
  async function fetchData() {
    try {
      setLoading(true);

      const res = await fetch(`/api/client/${params.id}`);
      const json = await res.json();

      setData(json.data);
    } catch (err) {
      console.error("Client fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [params.id]);

  /* =========================
     ACTION LOGGER 🔥
  ========================= */
  async function logAction(type: string, note?: string) {
    try {
      await fetch("/api/actions", {
        method: "POST",
        body: JSON.stringify({
          clientId: params.id,
          actionType: type,
          note,
        }),
      });

      fetchData(); // refresh timeline
    } catch (err) {
      console.error("Action log error:", err);
    }
  }

  if (loading)
    return <div className="p-4 text-center">Loading...</div>;

  if (!data)
    return <div className="p-4 text-center">No data</div>;

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
    <div className="space-y-5 max-w-xl mx-auto">

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
            <p className="text-xs text-gray-500">
              Total Due
            </p>
            <p className="font-bold text-lg">
              {formatCurrency(summary.totalAmountDue)}
            </p>
          </div>
        </div>
      </div>

      {/* =========================
          QUICK ACTIONS 🔥 (SMART)
      ========================= */}
      {mainPhone && (
        <div className="grid grid-cols-3 gap-2">

          <a
            href={`tel:${mainPhone}`}
            onClick={() => logAction("CALL")}
            className="btn btn-success text-center"
          >
            📞 Call
          </a>

          <a
            href={buildWhatsAppLink(mainPhone)}
            target="_blank"
            onClick={() => logAction("WHATSAPP")}
            className="btn btn-primary text-center"
          >
            💬 WhatsApp
          </a>

          <button
            onClick={() => {
              navigator.clipboard.writeText(mainPhone);
              logAction("COPY_PHONE");
            }}
            className="btn btn-secondary"
          >
            Copy
          </button>
        </div>
      )}

      {/* =========================
          AI DECISION 🧠
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">🧠 AI Decision</h2>

        <p className="text-sm">{ai.summary}</p>

        <div className="text-sm">
          🎯 <b>{ai.nextAction}</b>
        </div>

        <div className="text-sm">
          Tone: <b>{ai.tone}</b>
        </div>

        <div className="text-sm">
          Probability: {ai.paymentProbability}%
        </div>

        {ai.redFlags?.length > 0 && (
          <div className="text-xs text-red-500">
            ⚠ {ai.redFlags.join(" | ")}
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
            <div className="font-medium">
              Due: {formatCurrency(l.amountDue)}
            </div>
          </div>
        ))}
      </div>

      {/* =========================
          PHONES (FULL CONTROL)
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">📞 Phones</h2>

        {phones.map((p: any) => (
          <div
            key={p.id}
            className="flex items-center justify-between bg-gray-50 p-2 rounded"
          >
            <span>{p.phone}</span>

            <div className="flex gap-2">

              <a
                href={`tel:${p.phone}`}
                onClick={() => logAction("CALL")}
                className="text-green-600 text-xs"
              >
                Call
              </a>

              <a
                href={buildWhatsAppLink(p.phone)}
                target="_blank"
                onClick={() => logAction("WHATSAPP")}
                className="text-blue-600 text-xs"
              >
                WA
              </a>

            </div>
          </div>
        ))}
      </div>

      {/* =========================
          ADDRESSES + MAP
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
          OSINT
      ========================= */}
      <div className="card space-y-2">
        <h2 className="font-semibold">🔍 OSINT</h2>

        <p className="text-sm">{osint?.summary}</p>

        {osint?.confidenceScore && (
          <div className="text-xs">
            Confidence: {osint.confidenceScore}%
          </div>
        )}
      </div>

      {/* =========================
          TIMELINE 🔥
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
            <p className="font-medium">
              {a.actionType}
            </p>

            <p className="text-xs text-gray-500">
              {a.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
