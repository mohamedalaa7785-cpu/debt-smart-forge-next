"use client";

import Link from "next/link";
import RiskBadge from "./RiskBadge";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: any;
}

export default function ClientCard({ data }: Props) {
  const { client, summary, ai } = data;

  return (
    <Link
      href={`/client/${client.id}`}
      className="card space-y-2 block"
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <p className="font-semibold">{client.name}</p>

        <RiskBadge
          label={summary.riskLabel}
          score={summary.riskScore}
          size="sm"
        />
      </div>

      {/* FINANCIAL */}
      <div className="text-sm">
        💰 {formatCurrency(summary.totalAmountDue)}
      </div>

      {/* AI */}
      <div className="text-xs text-gray-500">
        {ai?.nextAction}
      </div>

      {/* PROBABILITY */}
      <div className="text-xs">
        {ai?.paymentProbability}% chance
      </div>
    </Link>
  );
        }
