"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 p-6 text-center">
      <div className="text-4xl" aria-hidden>
        ⚠️
      </div>
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-xs text-sm text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-2">
        <button onClick={() => reset()} className="rounded bg-black px-4 py-2 text-sm text-white">
          Try Again
        </button>
        <button onClick={() => window.location.reload()} className="rounded border px-4 py-2 text-sm">
          Reload
        </button>
      </div>
    </div>
  );
}
