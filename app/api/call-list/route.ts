import { NextRequest, NextResponse } from "next/server";
import { generateDailyCallList } from "@/server/services/daily-call.service";
import { withAuth } from "@/server/lib/auth";
import { APIResponse } from "@/types";
import { handleApiError } from "@/server/core/error.handler";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  return withAuth(async (user) => {
    try {
      const callList = await generateDailyCallList(user.id);

      return NextResponse.json({
        success: true,
        data: callList,
      } as APIResponse<any>);
    } catch (error) {
      return handleApiError(error);
    }
  });
}
