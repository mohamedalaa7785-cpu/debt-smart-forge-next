import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  autonomyApprovals,
  autonomyGoals,
  autonomyMetrics,
  autonomyRuns,
  autonomyTasks,
  contentDrafts,
} from "@/server/db/schema";
import { generateGrowthContent } from "@/server/services/content.service";
import { validateContentDraft } from "@/server/services/content-quality.service";

const defaultGoal = {
  name: "نمو Debt Smart Forge بأمان",
  description: "يراقب صحة المنتج، يقترح تحسينات، ويبني مسودات محتوى دون نشر خارجي قبل موافقة بشرية.",
  cadence: "daily",
  riskLevel: "low",
};

export async function ensureDefaultGoal(ownerId: string) {
  const existing = await db.query.autonomyGoals.findFirst({
    where: and(eq(autonomyGoals.ownerId, ownerId), eq(autonomyGoals.status, "active")),
    orderBy: [desc(autonomyGoals.createdAt)],
  });
  if (existing) return existing;
  const [created] = await db.insert(autonomyGoals).values({ ownerId, ...defaultGoal }).returning();
  return created;
}

export async function getAutonomyOverview(ownerId: string) {
  const goal = await ensureDefaultGoal(ownerId);
  const [runs, drafts] = await Promise.all([
    db.query.autonomyRuns.findMany({
      where: eq(autonomyRuns.ownerId, ownerId),
      orderBy: [desc(autonomyRuns.createdAt)],
      limit: 10,
    }),
    db.query.contentDrafts.findMany({
      where: eq(contentDrafts.ownerId, ownerId),
      orderBy: [desc(contentDrafts.createdAt)],
      limit: 10,
    }),
  ]);
  const runIds = runs.map((run) => run.id);
  const tasks = runIds.length
    ? await db.query.autonomyTasks.findMany({
        where: (table, { inArray }) => inArray(table.runId, runIds),
        orderBy: [desc(autonomyTasks.createdAt)],
        limit: 30,
      })
    : [];
  return { goal, runs, tasks, drafts };
}

export async function startAutonomyRun(ownerId: string, trigger = "manual") {
  const goal = await ensureDefaultGoal(ownerId);
  const generatedContent = await generateGrowthContent("إدارة الديون ببيانات أوضح وتجارب نمو قابلة للقياس", "linkedin");
  const contentQuality = validateContentDraft(generatedContent.title, generatedContent.body, generatedContent.callToAction);
  const [run] = await db
    .insert(autonomyRuns)
    .values({
      goalId: goal.id,
      ownerId,
      trigger,
      status: "completed",
      summary: "اكتملت دورة الفحص الأولية؛ تم إنشاء مقترحات تحتاج مراجعة بشرية.",
      findings: [
        { code: "health_check", severity: "info", message: "فحص صحة المنتج مطلوب قبل أي نشر." },
        { code: "content_gap", severity: "medium", message: "إنشاء محتوى تعليمي عربي حول إدارة الديون." },
        { code: "growth_experiment", severity: "low", message: "اختبار صفحة تعريفية وقياس التحويل قبل زيادة الإنفاق." },
        { code: "content_quality", severity: contentQuality.passed ? "info" : "high", message: contentQuality.passed ? "اجتازت المسودة فحوصات الجودة المحلية." : contentQuality.issues.join(" ") },
      ],
      requiresApproval: true,
      startedAt: new Date(),
      finishedAt: new Date(),
    })
    .returning();

  const taskValues = [
    {
      runId: run.id,
      type: "content_draft",
      title: "مسودة منشور تعليمي عربي",
      priority: 80,
      payload: { platform: "linkedin", topic: "التعامل الذكي مع الديون المتأخرة" },
    },
    {
      runId: run.id,
      type: "product_improvement",
      title: "اقتراح تحسين تجربة لوحة المخاطر",
      priority: 70,
      payload: { area: "dashboard", requiresApproval: true },
    },
    {
      runId: run.id,
      type: "quality_gate",
      title: "تشغيل فحوصات النوع والبناء قبل النشر",
      priority: 100,
      payload: { commands: ["pnpm typecheck", "pnpm smoke", "pnpm build"], qualityGate: contentQuality },
    },
  ];
  const tasks = await db.insert(autonomyTasks).values(taskValues).returning();
  await db.insert(autonomyApprovals).values(
    tasks.map((task) => ({ runId: run.id, taskId: task.id, reason: "النشر أو التغيير الخارجي يتطلب موافقة بشرية." })),
  );
  await db.insert(autonomyMetrics).values({
    ownerId,
    metric: "content_quality_score",
    value: String(contentQuality.score),
    source: "autonomy-run",
    windowStart: new Date(),
    windowEnd: new Date(),
    metadata: { passed: contentQuality.passed, issues: contentQuality.issues, trigger },
  });

  const contentTask = tasks.find((task) => task.type === "content_draft");
  if (contentTask) {
    await db.insert(contentDrafts).values({
      ownerId,
      taskId: contentTask.id,
      platform: "linkedin",
      title: generatedContent.title,
      body: `${generatedContent.body}\n\n${generatedContent.callToAction}`,
      status: "draft",
      metadata: { generatedBy: "autonomy-run", approvalRequired: true, safetyNotes: generatedContent.safetyNotes, quality: contentQuality },
    });
  }
  return run;
}
