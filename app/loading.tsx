export default function Loading() {
  return (
    <div className="p-4 max-w-xl mx-auto space-y-6 animate-pulse">

      {/* HEADER */}
      <div className="space-y-2">
        <div className="h-5 w-40 bg-gray-300 rounded"></div>
        <div className="h-4 w-24 bg-gray-200 rounded"></div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-gray-200 rounded-xl"></div>
        <div className="h-16 bg-gray-200 rounded-xl"></div>
      </div>

      {/* PHONES */}
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-300 rounded"></div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
      </div>

      {/* ADDRESSES */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-300 rounded"></div>
        <div className="h-10 bg-gray-200 rounded-xl"></div>
      </div>

      {/* LOANS */}
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-300 rounded"></div>
        <div className="h-20 bg-gray-200 rounded-xl"></div>
        <div className="h-20 bg-gray-200 rounded-xl"></div>
      </div>

      {/* AI */}
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-300 rounded"></div>
        <div className="h-16 bg-gray-200 rounded-xl"></div>
      </div>

      {/* OSINT */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-300 rounded"></div>
        <div className="h-16 bg-gray-200 rounded-xl"></div>
      </div>

    </div>
  );
          }
