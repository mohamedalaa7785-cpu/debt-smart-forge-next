import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/server/lib/auth";
import { getAutonomyOverview, setAutonomyStatus, startAutonomyRun } from "@/server/services/autonomy.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const overview = await getAutonomyOverview(user.id);
    return NextResponse.json({ success: true, data: overview });
  });
}

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { trigger?: string; action?: "pause" | "resume" };
    if (body.action === "pause" || body.action === "resume") {
      const goal = await setAutonomyStatus(user.id, body.action === "pause" ? "paused" : "active");
      return NextResponse.json({ success: true, data: goal });
    }

    try {
      const run = await startAutonomyRun(user.id, body.trigger || "manual");
      return NextResponse.json({ success: true, data: run }, { status: 201 });
    } catch (error) {
      const code = error instanceof Error ? error.message : "AUTONOMY_FAILED";
      if (code === "AUTONOMY_PAUSED") {
        return NextResponse.json({ success: false, error: "تم إيقاف التشغيل الآلي مؤقتاً." }, { status: 409 });
      }
      if (code === "AUTONOMY_RUN_IN_PROGRESS") {
        return NextResponse.json({ success: false, error: "توجد دورة تشغيل قيد التنفيذ بالفعل." }, { status: 409 });
      }
      throw error;
    }
  });
}
