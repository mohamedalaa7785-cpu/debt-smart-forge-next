"use client";

import { useCallback, useEffect, useState } from "react";

interface Overview {
  goal: { name: string; description: string; cadence: string; riskLevel: string };
  runs: Array<{ id: string; status: string; trigger: string; summary: string | null; createdAt: string }>;
  tasks: Array<{ id: string; type: string; title: string; status: string; priority: number }>;
  drafts: Array<{ id: string; platform: string; title: string; status: string; body: string }>;
}

const statusLabel: Record<string, string> = {
  completed: "مكتمل",
  queued: "في الانتظار",
  proposed: "مقترح",
  draft: "مسودة",
};

export default function AutonomyPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/autonomy", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setOverview(payload.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runCycle() {
    setRunning(true);
    setMessage("");
    const response = await fetch("/api/autonomy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trigger: "dashboard" }),
    });
    const payload = await response.json();
    setMessage(payload.success ? "تم إنشاء دورة جديدة. لا يوجد نشر خارجي قبل المراجعة." : "تعذر تشغيل الدورة.");
    setRunning(false);
    await load();
  }

  async function reviewTask(taskId: string, status: "approved" | "rejected") {
    const response = await fetch("/api/autonomy/approvals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    const payload = await response.json();
    setMessage(payload.success ? (status === "approved" ? "تم اعتماد المقترح، ولم يتم النشر الخارجي." : "تم رفض المقترح.") : "تعذرت مراجعة المقترح.");
    await load();
  }

  if (loading) return <main dir="rtl" className="mx-auto max-w-6xl p-6">جاري تحميل مركز القيادة...</main>;
  if (!overview) return <main dir="rtl" className="mx-auto max-w-6xl p-6">لا يمكن تحميل مركز القيادة حالياً.</main>;

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-sm font-semibold text-cyan-300">AUTONOMY CONTROL PLANE</p>
            <h1 className="text-3xl font-black">{overview.goal.name}</h1>
            <p className="mt-3 max-w-2xl text-slate-300">{overview.goal.description}</p>
          </div>
          <button onClick={runCycle} disabled={running} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
            {running ? "جاري التشغيل..." : "ابدأ دورة تحسين"}
          </button>
        </div>
        {message && <p className="mt-5 rounded-xl bg-white/10 p-3 text-sm text-cyan-100">{message}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="الحالة" value="نشط" detail={`إيقاع المراجعة: ${overview.goal.cadence}`} />
        <Metric title="التشغيلات" value={String(overview.runs.length)} detail="آخر 10 تشغيلات محفوظة" />
        <Metric title="المقترحات" value={String(overview.tasks.length)} detail="كل تغيير حساس يحتاج موافقة" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="المهام المقترحة">
          {overview.tasks.length === 0 ? <Empty /> : overview.tasks.map((task) => (
                          <div key={task.id} className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 md:flex-row md:items-center md:justify-between">
              <div><p className="font-bold text-slate-900">{task.title}</p><p className="text-xs text-slate-500">{task.type} · أولوية {task.priority}</p></div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{statusLabel[task.status] || task.status}</span>{task.status === "proposed" && <><button onClick={() => reviewTask(task.id, "approved")} className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white">اعتماد</button><button onClick={() => reviewTask(task.id, "rejected")} className="rounded-lg bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">رفض</button></>}</div>
            </div>

          ))}
        </Panel>

        <Panel title="مسودات المحتوى">
          {overview.drafts.length === 0 ? <Empty /> : overview.drafts.map((draft) => (
            <article key={draft.id} className="border-b border-slate-100 py-4 last:border-0">
              <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">{draft.title}</h3><span className="text-xs font-semibold text-slate-500">{draft.platform}</span></div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{draft.body}</p>
              <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{statusLabel[draft.status] || draft.status}</span>
            </article>
          ))}
        </Panel>
      </section>

      <Panel title="سجل التشغيلات">
        {overview.runs.length === 0 ? <Empty /> : overview.runs.map((run) => (
          <div key={run.id} className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-0 md:flex-row md:items-center md:justify-between"><div><p className="font-bold text-slate-900">{run.summary || "دورة تحسين"}</p><p className="text-xs text-slate-500">المحفز: {run.trigger}</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{statusLabel[run.status] || run.status}</span></div>
        ))}
      </Panel>
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-2 text-xl font-black text-slate-950">{title}</h2>{children}</section>;
}

function Empty() { return <p className="py-6 text-sm text-slate-500">لا توجد بيانات بعد. شغّل دورة تحسين لإنشاء مقترحات.</p>; }
