"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  /* =========================
     LOG ERROR (DEV ONLY)
  ========================= */
  useEffect(() => {
    console.error("APP ERROR:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">

      {/* ICON */}
      <div className="text-4xl">
        ⚠️
      </div>

      {/* TITLE */}
      <h2 className="text-lg font-semibold">
        Something went wrong
      </h2>

      {/* MESSAGE */}
      <p className="text-sm text-gray-500 max-w-xs">
        An unexpected error occurred. Please try again.
      </p>

      {/* ACTIONS */}
      <div className="flex gap-2">

        {/* RETRY */}
        <button
          onClick={() => reset()}
          className="px-4 py-2 text-sm bg-black text-white rounded"
        >
          Try Again
        </button>

        {/* RELOAD */}
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm border rounded"
        >
          Reload
        </button>
      </div>

      {/* DEBUG (DEV ONLY) */}
      {process.env.NODE_ENV === "development" && (
        <pre className="text-xs text-red-400 mt-4 max-w-xs overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  );
          }
