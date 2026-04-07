export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { withApiGuard } from "@/server/lib/auth";

export async function GET(req: NextRequest) {
  return withApiGuard(req, { method: "GET", route: "/api/auth/me" }, async (user) => {
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ success: true, data: user });
  });
}
