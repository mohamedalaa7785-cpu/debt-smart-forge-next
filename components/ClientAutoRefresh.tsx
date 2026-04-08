"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ClientAutoRefreshProps {
  intervalSec?: number;
}

export default function ClientAutoRefresh({
  intervalSec = 20,
}: ClientAutoRefreshProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalSec);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          router.refresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [intervalSec, router]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3">
      <p className="text-xs font-semibold text-blue-800">
        Auto-refresh enabled • updating in {secondsLeft}s
      </p>
      <button
        type="button"
        onClick={() => {
          setSecondsLeft(intervalSec);
          router.refresh();
        }}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
      >
        Refresh now
      </button>
    </div>
  );
}
