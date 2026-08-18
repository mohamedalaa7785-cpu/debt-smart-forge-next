import { z } from "zod";
import { safeJsonParse } from "@/lib/utils";
import { getGroqClient, getGroqModel } from "@/server/lib/groq-client";

const ContentDraftSchema = z.object({
  title: z.string().min(8).max(140),
  body: z.string().min(80).max(2500),
  callToAction: z.string().min(3).max(240),
  safetyNotes: z.array(z.string()).max(8),
});

export type ContentDraft = z.infer<typeof ContentDraftSchema>;

const fallbackDraft: ContentDraft = {
  title: "كيف ننتقل من مطاردة الديون إلى قرارات أذكى؟",
  body: "المتابعة الفعالة لا تبدأ برسالة أكثر حدة، بل ببيانات أوضح وتوقيت أفضل وخطة تواصل تحترم العميل. عندما يرى الفريق حالة كل ملف وإجراءاته القادمة في لوحة واحدة، يصبح اتخاذ القرار أسرع وأسهل في القياس. ابدأ بتوحيد البيانات، ثم راقب أثر كل خطوة قبل تعميمها.",
  callToAction: "اكتشف كيف يمكن للبيانات أن تجعل المتابعة أكثر وضوحاً وقابلية للقياس.",
  safetyNotes: ["مسودة للمراجعة البشرية", "لا تتضمن بيانات شخصية أو وعوداً مالية"],
};

export async function generateGrowthContent(topic: string, platform = "linkedin"): Promise<ContentDraft> {
  const client = getGroqClient();
  if (!client) return fallbackDraft;

  try {
    const response = await client.chat.completions.create({
      model: getGroqModel(),
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "أنت محرر محتوى عربي مهني. أعد JSON فقط بالمفاتيح title,body,callToAction,safetyNotes. اكتب محتوى تثقيفياً غير مضلل، بلا بيانات شخصية أو ادعاءات مالية أو وعود مضمونة. اجعل النص مناسباً للمنصة المطلوبة ويحتاج موافقة بشرية قبل النشر.",
        },
        { role: "user", content: JSON.stringify({ topic, platform }) },
      ],
    });
    const parsed = safeJsonParse<unknown>(response.choices[0]?.message?.content || "", null);
    const validated = ContentDraftSchema.safeParse(parsed);
    return validated.success ? validated.data : fallbackDraft;
  } catch {
    return fallbackDraft;
  }
}
