import { NextRequest, NextResponse } from "next/server";
import { generateDailyCallList } from "@/server/services/daily-call.service";
import { requireUser } from "@/server/lib/auth";
import { APIResponse } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const callList = await generateDailyCallList(user.id);

    return NextResponse.json({
      success: true,
      data: callList,
    } as APIResponse<any>);
  } catch (error: any) {
    console.error("GET /api/call-list error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
