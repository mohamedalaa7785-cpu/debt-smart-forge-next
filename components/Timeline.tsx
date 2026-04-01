"use client";

export default function Timeline({ actions }: any) {
  if (!actions || actions.length === 0) {
    return (
      <div className="card text-sm text-gray-400">
        No activity yet
      </div>
    );
  }

  return (
    <div className="card space-y-2">

      <h2 className="font-semibold">📅 Timeline</h2>

      {actions.map((a: any) => (
        <div key={a.id} className="text-sm border-b pb-1">
          <p>{a.actionType}</p>
          <p className="text-xs text-gray-500">
            {a.note}
          </p>
        </div>
      ))}
    </div>
  );
}
