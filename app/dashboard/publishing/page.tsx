"use client";

import { useCallback, useEffect, useState } from "react";

interface Channel {
  id: string;
  platform: string;
  displayName: string;
  status: string;
  dryRunOnly: boolean;
}

interface Job {
  id: string;
  status: string;
  scheduledFor: string | null;
  previewPayload: { title?: string; body?: string; platform?: string };
}

interface Overview {
  channels: Channel[];
  jobs: Job[];
}

const platforms = ["linkedin", "instagram", "facebook", "x"] as const;

export default function PublishingPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [platform, setPlatform] = useState<(typeof platforms)[number]>("linkedin");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/autonomy/publishing", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setOverview(payload.data);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addPreviewChannel() {
    setMessage("");
    const response = await fetch("/api/autonomy/publishing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "channel", platform, displayName }),
    });
    const payload = await response.json();
    setMessage(payload.success ? "تمت إضافة قناة معاينة فقط. لم يتم ربط حساب خارجي." : payload.error || "تعذر إنشاء القناة.");
    if (payload.success) { setDisplayName(""); await load(); }
  }

  if (loading) return <main dir="rtl" className="mx-auto max-w-6xl p-6">جاري تحميل مركز القنوات...</main>;
  if (!overview) return <main dir="rtl" className="mx-auto max-w-6xl p-6">تعذر تحميل مركز القنوات.</main>;

  return (
    <main dir="rtl" className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
        <p className="text-sm font-semibold text-cyan-300">PUBLISHING CONTROL CENTER</p>
        <h1 className="mt-2 text-3xl font-black">مركز القنوات والنشر الآمن</h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-300">إدارة الحسابات تبدأ بوضع المعاينة. لا توجد رموز وصول هنا، ولا ينتقل أي محتوى إلى منصة خارجية إلا بعد اعتماد المسودة وتفعيل القناة صراحة.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="القنوات" value={String(overview.channels.length)} detail="قنوات مسجلة للمعاينة" />
        <Metric title="مهام النشر" value={String(overview.jobs.length)} detail="سجل قابل للتدقيق" />
        <Metric title="الوضع الحالي" value="معاينة" detail="النشر الخارجي متوقف" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">إضافة قناة معاينة</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">هذه الخطوة تنشئ سجلاً داخلياً فقط. ربط OAuth ومفاتيح النشر يأتي بعد اختبار المعاينة وموافقة المستخدم.</p>
          <label className="mt-5 block text-sm font-bold text-slate-700">المنصة</label>
          <select value={platform} onChange={(event) => setPlatform(event.target.value as (typeof platforms)[number])} className="mt-2 w-full rounded-xl border border-slate-300 p-3">
            {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="mt-4 block text-sm font-bold text-slate-700">اسم القناة</label>
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="مثال: صفحة Debt Smart Forge" className="mt-2 w-full rounded-xl border border-slate-300 p-3" />
          <button onClick={addPreviewChannel} disabled={displayName.trim().length < 2} className="mt-4 w-full rounded-xl bg-cyan-600 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">إضافة للمعاينة</button>
          {message && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">القنوات المسجلة</h2>
          {overview.channels.length === 0 ? <Empty text="لم تتم إضافة قنوات بعد." /> : overview.channels.map((channel) => (
            <div key={channel.id} className="flex items-center justify-between border-b border-slate-100 py-4 last:border-0">
              <div><p className="font-bold text-slate-900">{channel.displayName}</p><p className="text-xs text-slate-500">{channel.platform}</p></div>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">{channel.dryRunOnly ? "معاينة فقط" : channel.status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">طابور النشر</h2>
        {overview.jobs.length === 0 ? <Empty text="ستظهر هنا مهام المعاينة بعد اعتماد مسودة وجدولتها." /> : overview.jobs.map((job) => (
          <article key={job.id} className="border-b border-slate-100 py-4 last:border-0">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">{job.previewPayload.title || "مسودة محتوى"}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{job.status}</span></div>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{job.previewPayload.body || "لا يوجد نص معاينة"}</p>
            <p className="mt-2 text-xs text-slate-500">المنصة: {job.previewPayload.platform || "غير محددة"} · الجدولة: {job.scheduledFor ? new Date(job.scheduledFor).toLocaleString("ar-EG") : "غير مجدولة"}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

function Empty({ text }: { text: string }) { return <p className="py-6 text-sm text-slate-500">{text}</p>; }
