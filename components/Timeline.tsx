"use client";

import { formatDistanceToNow } from "date-fns";

interface Action {
  id: string;
  actionType: string;
  note: string | null;
  createdAt: string | Date;
}

export default function Timeline({ actions }: { actions: Action[] }) {
  if (!actions || actions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400 text-sm font-medium border border-dashed border-gray-200">
        No activity recorded yet.
      </div>
    );
  }

  const sortedActions = [...actions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getIcon = (type: string) => {
    const t = type.toUpperCase();
    if (t === "CALL") return "📞";
    if (t === "WHATSAPP") return "💬";
    if (t === "VISIT") return "📍";
    if (t === "LEGAL") return "⚖️";
    if (t === "FOLLOW") return "⏰";
    if (t === "PAYMENT") return "💰";
    return "📝";
  };

  const getBadgeColor = (type: string) => {
    const t = type.toUpperCase();
    if (t === "CALL") return "bg-green-100 text-green-700";
    if (t === "WHATSAPP") return "bg-blue-100 text-blue-700";
    if (t === "VISIT") return "bg-indigo-100 text-indigo-700";
    if (t === "LEGAL") return "bg-red-100 text-red-700";
    if (t === "FOLLOW") return "bg-orange-100 text-orange-700";
    if (t === "PAYMENT") return "bg-emerald-100 text-emerald-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
      {sortedActions.map((a) => (
        <div key={a.id} className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white border-2 border-gray-100 shadow-sm z-10 text-lg">
            {getIcon(a.actionType)}
          </div>
          
          <div className="flex-1 pt-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getBadgeColor(a.actionType)}`}>
                  {a.actionType}
                </span>
                <span className="text-xs font-bold text-gray-400">
                  {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-sm text-gray-700 font-medium leading-relaxed">
                {a.note || "No details provided."}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
