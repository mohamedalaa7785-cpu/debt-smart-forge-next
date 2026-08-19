import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { autonomyExperiments } from "@/server/db/schema";
import { withRole } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

const ExperimentSchema = z.object({
  name: z.string().trim().min(4).max(160),
  hypothesis: z.string().trim().min(20).max(1200),
  channel: z.string().trim().min(2).max(80),
  baselineMetric: z.string().trim().min(2).max(80),
  targetMetric: z.string().trim().min(2).max(80),
  baselineValue: z.number().finite().optional(),
  targetValue: z.number().finite().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  notes: z.string().trim().max(1200).optional(),
});

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const experiments = await db.query.autonomyExperiments.findMany({
      where: eq(autonomyExperiments.ownerId, user.id),
      orderBy: [desc(autonomyExperiments.createdAt)],
      limit: 50,
    });
    return NextResponse.json({ success: true, data: experiments });
  });
}

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const parsed = ExperimentSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "بيانات التجربة غير مكتملة أو غير صالحة." }, { status: 400 });
    }

    const value = parsed.data;
    if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      return NextResponse.json({ success: false, error: "يجب أن ينتهي الاختبار بعد وقت بدايته." }, { status: 400 });
    }

    const [experiment] = await db.insert(autonomyExperiments).values({
      ownerId: user.id,
      name: value.name,
      hypothesis: value.hypothesis,
      channel: value.channel,
      status: "proposed",
      baselineMetric: value.baselineMetric,
      targetMetric: value.targetMetric,
      baselineValue: value.baselineValue?.toString(),
      targetValue: value.targetValue?.toString(),
      startsAt: value.startsAt ? new Date(value.startsAt) : undefined,
      endsAt: value.endsAt ? new Date(value.endsAt) : undefined,
      notes: value.notes,
      metadata: { requiresApproval: true, createdVia: "experiments-api" },
    }).returning();

    return NextResponse.json({ success: true, data: experiment }, { status: 201 });
  });
}

export async function PATCH(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = await request.json().catch(() => ({})) as { id?: string; status?: string; actualValue?: number; notes?: string };
    if (!body.id || !z.enum(["proposed", "approved", "running", "completed", "paused", "failed"]).safeParse(body.status).success) {
      return NextResponse.json({ success: false, error: "معرف التجربة والحالة الجديدة مطلوبان." }, { status: 400 });
    }
    if (body.actualValue !== undefined && !Number.isFinite(body.actualValue)) {
      return NextResponse.json({ success: false, error: "القيمة الفعلية غير صالحة." }, { status: 400 });
    }

    const [updated] = await db.update(autonomyExperiments)
      .set({ status: body.status, actualValue: body.actualValue?.toString(), notes: body.notes, updatedAt: new Date() })
      .where(and(eq(autonomyExperiments.id, body.id), eq(autonomyExperiments.ownerId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ success: false, error: "التجربة غير موجودة." }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  });
}
