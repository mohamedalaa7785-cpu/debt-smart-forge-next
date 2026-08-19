import { getGroqClient, getGroqModel } from "@/server/lib/groq-client";
import { safeJsonParse } from "@/lib/utils";

export type GrowthContent = {
  title: string;
  body: string;
  callToAction: string;
  hashtags: string[];
  platform: "linkedin" | "facebook" | "instagram" | "x";
  safetyNotes: string[];
};

function fallback(topic: string, platform: GrowthContent["platform"]): GrowthContent {
  return {
    title: `دليل عملي: ${topic}`,
    body: `القرارات الأفضل لا تبدأ بزيادة الضغط، بل ببيانات أوضح وتوقيت مناسب وخطوات قابلة للقياس. في Debt Smart Forge نساعد الفرق على فهم الأولويات، توحيد المتابعة، وتحويل الإشارات إلى إجراءات عملية تحافظ على الاحترافية وتزيد فرص التسوية.`,
    callToAction: "اكتشف كيف يمكن لفريقك تنظيم المتابعة بذكاء.",
    hashtags: ["إدارة_الديون", "الذكاء_الاصطناعي", "FinTech"],
    platform,
    safetyNotes: ["لا تستخدم بيانات شخصية حقيقية في المنشور.", "راجع المحتوى بشرياً قبل النشر.", "لا تقدم وعداً مالياً مضموناً."],
  };
}

export async function generateGrowthContent(topic: string, platform: GrowthContent["platform"] = "linkedin") {
  const client = getGroqClient();
  if (!client) return fallback(topic, platform);
  try {
    const response = await client.chat.completions.create({
      model: getGroqModel(),
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "اكتب محتوى تسويقياً عربياً مهنياً لمنصة تقنية مالية. أخرج JSON فقط بالمفاتيح title,body,callToAction,hashtags,safetyNotes. لا تستخدم ادعاءات ربح مضمون، ولا بيانات شخصية، ولا ضغطاً أو تهديداً على المدينين.",
        },
        { role: "user", content: JSON.stringify({ topic, platform }) },
      ],
    });
    const parsed = safeJsonParse<Partial<GrowthContent> | null>(response.choices[0]?.message?.content || "", null);
    if (!parsed || typeof parsed.title !== "string" || typeof parsed.body !== "string") return fallback(topic, platform);
    return {
      ...fallback(topic, platform),
      ...parsed,
      platform,
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((v): v is string => typeof v === "string").slice(0, 8) : fallback(topic, platform).hashtags,
      safetyNotes: Array.isArray(parsed.safetyNotes) ? parsed.safetyNotes.filter((v): v is string => typeof v === "string") : fallback(topic, platform).safetyNotes,
    } as GrowthContent;
  } catch {
    return fallback(topic, platform);
  }
}
