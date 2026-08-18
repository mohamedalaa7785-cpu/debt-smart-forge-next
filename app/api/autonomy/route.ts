import { NextRequest, NextResponse } from "next/server";
import { withRole } from "@/server/lib/auth";
import { getAutonomyOverview, startAutonomyRun } from "@/server/services/autonomy.service";

export const dynamic = "force-dynamic";

export async function GET() {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const overview = await getAutonomyOverview(user.id);
    return NextResponse.json({ success: true, data: overview });
  });
}

export async function POST(request: NextRequest) {
  return withRole(["admin", "supervisor", "hidden_admin"], async (user) => {
    const body = (await request.json().catch(() => ({}))) as { trigger?: string };
    const run = await startAutonomyRun(user.id, body.trigger || "manual");
    return NextResponse.json({ success: true, data: run }, { status: 201 });
  });
}
