"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildWhatsAppLink } from "@/lib/utils";

type TemplateCategory =
  | "متابعة أولى"
  | "متابعة ثانية"
  | "قبل التصعيد"
  | "Promise للدفع"
  | "متابعة قانونية"
  | "آخر محاولة"
  | "عدم الرد"
  | "تأكيد دفع"
  | "كسر تهرب العميل"
  | "إعادة تواصل";

interface TemplateItem {
  id: string;
  title: string;
  category: TemplateCategory;
  content: string;
  editable?: boolean;
}

interface ClientVars {
  client_name: string;
  bank_name: string;
  collector_name: string;
  amount: string;
  due_date: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  phone: string;
  vars: ClientVars;
}

const baseTemplates: TemplateItem[] = [
  { id: "t1", category: "متابعة أولى", title: "تواصل أولي", content: "أستاذ/{{client_name}} نرجو سرعة التواصل بخصوص ملفكم لدى {{bank_name}} لتجنب استكمال إجراءات المتابعة." },
  { id: "t2", category: "متابعة ثانية", title: "تأكيد موقف السداد", content: "مع حضرتك أ/{{collector_name}} الشؤون القانونية {{bank_name}} ونحتاج تأكيد موقف السداد اليوم." },
  { id: "t3", category: "Promise للدفع", title: "تسجيل وعد سداد", content: "مطلوب تحديد موعد واضح للسداد قبل {{due_date}} لإثبات الجدية وتسجيل Promise على السيستم. القيمة المطلوبة {{amount}}." },
  { id: "t4", category: "آخر محاولة", title: "إنذار نهائي", content: "آخر محاولة للتواصل قبل تحويل الملف للمراجعة القانونية المباشرة." },
  { id: "t5", category: "عدم الرد", title: "عدم الاستجابة", content: "برجاء عدم تجاهل التواصل حفاظًا على موقف الملف، ونتوقع ردكم اليوم." },
  { id: "t6", category: "قبل التصعيد", title: "قبل التصعيد", content: "نرجو تسوية المديونية لدى {{bank_name}} بمبلغ {{amount}} قبل {{due_date}} لتجنب التصعيد." },
  { id: "t7", category: "متابعة قانونية", title: "إشعار قانوني", content: "في حال عدم الرد سيتم رفع الملف قانونيًا من خلال إدارة {{bank_name}}، برجاء تأكيد الموقف فورًا." },
  { id: "t8", category: "تأكيد دفع", title: "تأكيد استلام", content: "نشكر حضرتك أ/{{client_name}}، يرجى إرسال إشعار التحويل لتأكيد السداد على ملف {{bank_name}}." },
  { id: "t9", category: "كسر تهرب العميل", title: "رسالة حازمة", content: "تم رصد تعذر التواصل المتكرر، ونؤكد أن الرد الفوري يساهم في الحفاظ على الوضع الائتماني." },
  { id: "t10", category: "إعادة تواصل", title: "إعادة فتح التواصل", content: "نرحب بإعادة التواصل لتحديث خطة السداد المناسبة لحضرتك مع {{bank_name}}." }
];

const categories: TemplateCategory[] = ["متابعة أولى","متابعة ثانية","قبل التصعيد","Promise للدفع","متابعة قانونية","آخر محاولة","عدم الرد","تأكيد دفع","كسر تهرب العميل","إعادة تواصل"];

export default function WhatsAppTemplatesDrawer({ open, onClose, phone, vars }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "الكل">("الكل");
  const [custom, setCustom] = useState<TemplateItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setCustom(JSON.parse(localStorage.getItem("wa_custom_templates") || "[]"));
    setFavorites(JSON.parse(localStorage.getItem("wa_favorites") || "[]"));
    setUsage(JSON.parse(localStorage.getItem("wa_usage") || "{}"));
    setRecent(JSON.parse(localStorage.getItem("wa_recent") || "[]"));
  }, []);

  function persist(next: { custom?: TemplateItem[]; favorites?: string[]; usage?: Record<string, number>; recent?: string[] }) {
    if (next.custom) localStorage.setItem("wa_custom_templates", JSON.stringify(next.custom));
    if (next.favorites) localStorage.setItem("wa_favorites", JSON.stringify(next.favorites));
    if (next.usage) localStorage.setItem("wa_usage", JSON.stringify(next.usage));
    if (next.recent) localStorage.setItem("wa_recent", JSON.stringify(next.recent));
  }

  const templates = useMemo(() => [...baseTemplates, ...custom], [custom]);

  const filtered = templates.filter((t) => {
    const matchCategory = activeCategory === "الكل" || t.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q);
    return matchCategory && matchSearch;
  });

  const renderTemplate = (text: string) =>
    text
      .replaceAll("{{client_name}}", vars.client_name)
      .replaceAll("{{bank_name}}", vars.bank_name)
      .replaceAll("{{collector_name}}", vars.collector_name)
      .replaceAll("{{amount}}", vars.amount)
      .replaceAll("{{due_date}}", vars.due_date);

  const onUse = (id: string) => {
    const nextUsage = { ...usage, [id]: (usage[id] || 0) + 1 };
    const nextRecent = [id, ...recent.filter((r) => r !== id)].slice(0, 6);
    setUsage(nextUsage); setRecent(nextRecent); persist({ usage: nextUsage, recent: nextRecent });
  };

  return <AnimatePresence>{open && (
    <motion.div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}>
      <motion.div initial={{x:420}} animate={{x:0}} exit={{x:420}} transition={{type:"spring", stiffness:260, damping:24}} onClick={(e)=>e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-slate-900 p-5 overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">WhatsApp Templates</h3><button onClick={onClose} className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700">✕</button></div>
        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search templates..." className="w-full rounded-xl border px-4 py-2 mb-3 bg-white dark:bg-slate-800" />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4"><button onClick={()=>setActiveCategory("الكل")} className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs">الكل</button>{categories.map((c)=><button key={c} onClick={()=>setActiveCategory(c)} className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs">{c}</button>)}</div>
        <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60"><p className="text-xs font-semibold mb-2">آخر الرسائل المستخدمة</p><div className="flex flex-wrap gap-2">{recent.length?recent.map((r)=><span key={r} className="text-xs px-2 py-1 rounded bg-white dark:bg-slate-700">{templates.find((t)=>t.id===r)?.title}</span>):<span className="text-xs text-slate-500">لا يوجد استخدام بعد</span>}</div></div>
        <div className="space-y-3">
          {filtered.map((t)=><div key={t.id} className="rounded-xl border p-3 bg-white dark:bg-slate-800/70">
            <div className="flex items-center justify-between gap-2 mb-2"><h4 className="font-semibold text-slate-900 dark:text-white">{t.title}</h4><div className="flex items-center gap-2"><button onClick={()=>{const next=favorites.includes(t.id)?favorites.filter(f=>f!==t.id):[...favorites,t.id];setFavorites(next);persist({favorites:next});}} className="text-sm">{favorites.includes(t.id)?"⭐":"☆"}</button><span className="text-xs text-slate-500">Used {usage[t.id]||0}</span></div></div>
            <textarea value={t.content} onChange={(e)=>{if(!t.editable) return; const next=custom.map((x)=>x.id===t.id?{...x, content:e.target.value}:x); setCustom(next); persist({custom:next});}} className="w-full min-h-24 rounded-lg border p-2 text-sm bg-slate-50 dark:bg-slate-900" readOnly={!t.editable} />
            <div className="mt-2 flex gap-2"><button onClick={()=>{navigator.clipboard.writeText(renderTemplate(t.content)); onUse(t.id);}} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">Copy</button><a target="_blank" href={buildWhatsAppLink(phone, renderTemplate(t.content))} onClick={()=>onUse(t.id)} className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm">Send WhatsApp</a></div>
          </div>)}
        </div>
        <button onClick={()=>{const item:TemplateItem={id:`custom-${Date.now()}`,title:"New Template",category:"إعادة تواصل",content:"",editable:true}; const next=[item,...custom]; setCustom(next); persist({custom:next});}} className="mt-4 w-full rounded-xl border-2 border-dashed py-2 text-sm font-semibold">+ Add Template</button>
      </motion.div>
    </motion.div>
  )}</AnimatePresence>;
}
