"use client";

import { useEffect, useState } from "react";

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
        setData(res);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!data) return <div className="p-4">No data</div>;

  const { client, phones, addresses, loans, summary, ai, osint } = data;

  return (
    <div className="p-4 space-y-6 max-w-xl mx-auto">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold">{client.name}</h1>
        <p className="text-sm">
          Risk: <b>{summary.riskLabel}</b>
        </p>
        <p className="text-sm">
          Due: <b>{summary.totalAmountDue}</b>
        </p>
      </div>

      {/* PHONES */}
      <div>
        <h2 className="font-semibold">Phones</h2>
        {phones.map((p: any) => (
          <div key={p.id} className="flex gap-2 mt-2">
            <span>{p.phone}</span>
            <a href={`tel:${p.phone}`} className="text-blue-500">
              Call
            </a>
          </div>
        ))}
      </div>

      {/* ADDRESSES */}
      <div>
        <h2 className="font-semibold">Addresses</h2>
        {addresses.map((a: any) => (
          <div key={a.id}>{a.address}</div>
        ))}
      </div>

      {/* LOANS */}
      <div>
        <h2 className="font-semibold">Loans</h2>
        {loans.map((l: any) => (
          <div key={l.id} className="border p-2 rounded mt-2">
            <p>{l.loanType}</p>
            <p>EMI: {l.emi}</p>
            <p>Due: {l.amountDue}</p>
          </div>
        ))}
      </div>

      {/* AI */}
      <div>
        <h2 className="font-semibold">AI Analysis</h2>
        <p>{ai.summary}</p>
        <p>Next: {ai.nextBestAction}</p>
        <p>Tone: {ai.communicationTone}</p>
      </div>

      {/* OSINT */}
      <div>
        <h2 className="font-semibold">OSINT</h2>
        <p>{osint?.summary}</p>
      </div>
    </div>
  );
      }
