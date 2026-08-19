import Link from "next/link";

const plans = [
  {
    name: "البداية",
    price: "$49",
    description: "للفرق الصغيرة التي تريد تنظيم المتابعة وقياس الأداء.",
    features: ["لوحة العملاء الأساسية", "تقارير شهرية", "مسودات محتوى بمراجعة بشرية"],
  },
  {
    name: "النمو",
    price: "$149",
    description: "للشركات التي تحتاج أتمتة وتحليلات متعددة القنوات.",
    features: ["كل مزايا البداية", "مركز القيادة الذاتية", "توليد محتوى متعدد المنصات", "تحليلات تجارب النمو"],
    featured: true,
  },
  {
    name: "المؤسسات",
    price: "مخصص",
    description: "للفرق الكبيرة التي تحتاج صلاحيات وتكاملات ودعماً مخصصاً.",
    features: ["صلاحيات ومراجعات متقدمة", "تكاملات خاصة", "اتفاقية مستوى خدمة", "تهيئة تطبيق جوال للفرق"],
  },
];

export default function PricingPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/login" className="text-sm font-bold text-cyan-300 hover:text-cyan-200">العودة إلى تسجيل الدخول</Link>
        <div className="mt-12 max-w-3xl">
          <p className="text-sm font-black tracking-[0.24em] text-cyan-300">DEBT SMART OS</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">نمو أكثر ذكاءً، وقرارات تحصيل قابلة للقياس.</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">اختر نقطة البداية المناسبة لفريقك. هذه الأسعار مبدئية للاختبار التجاري، ولا يتم تحصيل أي مبلغ من هذه الصفحة قبل ربط بوابة دفع وموافقة صريحة.</p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`rounded-3xl border p-7 ${plan.featured ? "border-cyan-300 bg-cyan-300 text-slate-950 shadow-2xl shadow-cyan-950/40" : "border-white/15 bg-white/5"}`}>
              {plan.featured && <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-cyan-200">الأكثر ملاءمة للنمو</span>}
              <h2 className="mt-5 text-2xl font-black">{plan.name}</h2>
              <p className={`mt-3 min-h-16 leading-7 ${plan.featured ? "text-slate-800" : "text-slate-300"}`}>{plan.description}</p>
              <p className="mt-8 text-4xl font-black">{plan.price}<span className="text-sm font-bold">{plan.price.startsWith("$") ? " / شهر" : ""}</span></p>
              <ul className={`mt-8 space-y-3 text-sm leading-6 ${plan.featured ? "text-slate-900" : "text-slate-200"}`}>
                {plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
              </ul>
              <Link href="/login" className={`mt-9 block rounded-xl px-4 py-3 text-center font-black transition ${plan.featured ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-white text-slate-950 hover:bg-cyan-100"}`}>ابدأ محادثة تجريبية</Link>
            </article>
          ))}
        </div>

        <p className="mt-10 text-center text-xs leading-6 text-slate-400">الأسعار لا تمثل وعداً بالإيراد أو النتائج. نجاح المنتج يعتمد على ملاءمة السوق، جودة التنفيذ، الامتثال، واختبار التحويل الفعلي.</p>
      </section>
    </main>
  );
}
