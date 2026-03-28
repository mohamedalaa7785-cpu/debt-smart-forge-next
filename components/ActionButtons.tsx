"use client";

import { buildWhatsAppLink } from "@/lib/utils";

interface Props {
  phone: string;
}

export default function ActionButtons({ phone }: Props) {
  if (!phone) return null;

  return (
    <div className="grid grid-cols-3 gap-2">

      <a
        href={`tel:${phone}`}
        className="btn btn-success text-center"
      >
        📞
      </a>

      <a
        href={buildWhatsAppLink(phone)}
        className="btn btn-primary text-center"
      >
        💬
      </a>

      <button
        onClick={() => navigator.clipboard.writeText(phone)}
        className="btn btn-secondary"
      >
        📋
      </button>
    </div>
  );
}
