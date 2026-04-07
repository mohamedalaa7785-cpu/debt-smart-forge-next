import { NextRequest, NextResponse } from "next/server";
import { generateDailyCallList } from "@/server/services/daily-call.service";
import { APIResponse } from "@/types";
import { withApiGuard } from "@/server/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withApiGuard(req, { method: "GET", route: "/api/call-list" }, async (user) => {
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
      const callList = await generateDailyCallList(user.id);
      return NextResponse.json({ success: true, data: callList } as APIResponse<any>);
    } catch (error) {
      console.error("GET /api/call-list error:", error);
      return NextResponse.json({ success: false, error: "Failed to generate call list" }, { status: 500 });
    }
  });
}
