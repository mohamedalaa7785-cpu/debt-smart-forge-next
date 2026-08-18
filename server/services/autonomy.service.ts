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
  const [runs, drafts, metrics] = await Promise.all([
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
  ]);
  const runIds = runs.map((run) => run.id);
  const tasks = runIds.length
    ? await db.query.autonomyTasks.findMany({
        where: (table, { inArray }) => inArray(table.runId, runIds),
        orderBy: [desc(autonomyTasks.createdAt)],
        limit: 30,
      })
    : [];
  return { goal, runs, tasks, drafts, metrics };
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
      summary: "دورة الفحص قيد التنفيذ؛ لم يحدث نشر خارجي أو تغيير مالي.",
      findings: [],
      requiresApproval: true,
      startedAt,
    })
    .returning();

  try {
    const generatedContent = await generateGrowthContent("إدارة الديون ببيانات أوضح وتجارب نمو قابلة للقياس", "linkedin");
    const contentQuality = validateContentDraft(generatedContent.title, generatedContent.body, generatedContent.callToAction);

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
    await db
      .update(autonomyGoals)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(autonomyGoals.id, goal.id));

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
