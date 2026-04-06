import { NextRequest, NextResponse } from "next/server";
import { generateDailyCallList } from "@/server/services/daily-call.service";
import { APIResponse } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "default";

    const callList = await generateDailyCallList(userId);

    return NextResponse.json({
      success: true,
      data: callList
    } as APIResponse<any>);
  } catch (error) {
    console.error("GET /api/call-list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate call list" },
      { status: 500 }
    );
  }
}
