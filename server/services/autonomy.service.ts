import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  autonomyApprovals,
  autonomyGoals,
  autonomyMetrics,
  autonomyExperiments,
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
    where: eq(autonomyGoals.ownerId, ownerId),
    orderBy: [desc(autonomyGoals.createdAt)],
  });
  if (existing) return existing;
  const [created] = await db.insert(autonomyGoals).values({ ownerId, ...defaultGoal }).returning();
  return created;
}

export async function getAutonomyOverview(ownerId: string) {
  const goal = await ensureDefaultGoal(ownerId);
  const [runs, drafts, metrics, experiments] = await Promise.all([
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
    db.query.autonomyMetrics.findMany({
      where: eq(autonomyMetrics.ownerId, ownerId),
      orderBy: [desc(autonomyMetrics.createdAt)],
      limit: 10,
    }),
    db.query.autonomyExperiments.findMany({
      where: eq(autonomyExperiments.ownerId, ownerId),
      orderBy: [desc(autonomyExperiments.createdAt)],
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
  return { goal, runs, tasks, drafts, metrics, experiments };
}

export async function setAutonomyStatus(ownerId: string, status: "active" | "paused") {
  const goal = await ensureDefaultGoal(ownerId);
  const [updated] = await db
    .update(autonomyGoals)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(autonomyGoals.id, goal.id), eq(autonomyGoals.ownerId, ownerId)))
    .returning();
  return updated;
}

export async function startAutonomyRun(ownerId: string, trigger = "manual") {
  const goal = await ensureDefaultGoal(ownerId);
  if (goal.status !== "active") {
    throw new Error("AUTONOMY_PAUSED");
  }

  const recentRun = await db.query.autonomyRuns.findFirst({
    where: and(eq(autonomyRuns.ownerId, ownerId), eq(autonomyRuns.status, "running")),
    orderBy: [desc(autonomyRuns.createdAt)],
  });
  if (recentRun) {
    throw new Error("AUTONOMY_RUN_IN_PROGRESS");
  }
  const startedAt = new Date();
  const [run] = await db
    .insert(autonomyRuns)
    .values({
      goalId: goal.id,
      ownerId,
      trigger,
      status: "running",
      summary: "بدأت دورة الفحص؛ سيتم إنشاء مقترحات تحتاج مراجعة بشرية.",
      findings: [],
      requiresApproval: true,
      startedAt,
    })
    .returning();

  try {
    const topic = "التعامل الذكي مع الديون المتأخرة";
    const platformNames = ["linkedin", "instagram", "x"] as const;
    const generatedVariants = await Promise.all(
      platformNames.map(async (platform) => {
        const content = await generateGrowthContent("إدارة الديون ببيانات أوضح وتجارب نمو قابلة للقياس", platform);
        return { platform, content, quality: validateContentDraft(content.title, content.body, content.callToAction) };
      }),
    );
    const primaryVariant = generatedVariants[0];
    const contentQuality = primaryVariant.quality;

    const taskValues = [
    ...generatedVariants.map(({ platform }) => ({
      runId: run.id,
      type: "content_draft",
      title: `مسودة منشور تعليمي عربي - ${platform}`,
      priority: 80,
      payload: { platform, topic },
    })),
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
    await db
      .update(autonomyGoals)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(autonomyGoals.id, goal.id));

    await db.insert(autonomyExperiments).values({
      ownerId,
      runId: run.id,
      name: "اختبار تحويل صفحة التعريف",
      hypothesis: "عرض نتيجة قابلة للقياس مع دعوة واضحة سيزيد طلبات العرض من جمهور شركات التحصيل.",
      channel: "landing-page",
      status: "proposed",
      baselineMetric: "demo_request_rate",
      targetMetric: "demo_request_rate",
      notes: "تحتاج موافقة بشرية وتحديد خط أساس قبل التشغيل.",
      metadata: { requiresApproval: true, source: "autonomy-run" },
    });

    await db.insert(autonomyMetrics).values({
    ownerId,
    metric: "content_quality_score",
    value: String(contentQuality.score),
    source: "autonomy-run",
    windowStart: new Date(),
    windowEnd: new Date(),
    metadata: { passed: contentQuality.passed, issues: contentQuality.issues, trigger },
  });

    const contentTasks = tasks.filter((task) => task.type === "content_draft");
    if (contentTasks.length) {
      await db.insert(contentDrafts).values(
        contentTasks.map((task) => {
          const platform = String((task.payload as { platform?: string } | null)?.platform || "linkedin");
          const variant = generatedVariants.find((item) => item.platform === platform) || primaryVariant;
          return {
            ownerId,
            taskId: task.id,
            platform,
            title: variant.content.title,
            body: `${variant.content.body}\n\n${variant.content.callToAction}`,
            status: "draft",
            metadata: { generatedBy: "autonomy-run", approvalRequired: true, safetyNotes: variant.content.safetyNotes, quality: variant.quality },
          };
        }),
      );
    }

    const findings = [
      { code: "health_check", severity: "info", message: "فحص صحة المنتج مطلوب قبل أي نشر." },
      { code: "content_gap", severity: "medium", message: "إنشاء محتوى تعليمي عربي حول إدارة الديون." },
      { code: "growth_experiment", severity: "low", message: "اختبار صفحة تعريفية وقياس التحويل قبل زيادة الإنفاق." },
      { code: "content_quality", severity: contentQuality.passed ? "info" : "high", message: contentQuality.passed ? "اجتازت المسودة فحوصات الجودة المحلية." : contentQuality.issues.join(" ") },
    ];
    const [completedRun] = await db
      .update(autonomyRuns)
      .set({ status: "completed", summary: "اكتملت دورة الفحص الأولية؛ تم إنشاء مقترحات تحتاج مراجعة بشرية.", findings, finishedAt: new Date() })
      .where(eq(autonomyRuns.id, run.id))
      .returning();
    return completedRun;
  } catch (error) {
    const [failedRun] = await db
      .update(autonomyRuns)
      .set({ status: "failed", summary: "فشلت دورة التشغيل قبل اكتمالها.", findings: [{ code: "run_failed", severity: "high", message: error instanceof Error ? error.message : "Unknown error" }], finishedAt: new Date() })
      .where(eq(autonomyRuns.id, run.id))
      .returning();
    throw Object.assign(new Error("AUTONOMY_RUN_FAILED"), { cause: failedRun });
  }
}
