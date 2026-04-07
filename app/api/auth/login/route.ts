import { NextRequest, NextResponse } from "next/server";
import { login } from "@/server/services/auth.service";
import { logAction } from "@/server/services/log.service";
import { withApiGuard } from "@/server/lib/auth";

export async function POST(req: NextRequest) {
  return withApiGuard(req, { method: "POST", route: "/api/auth/login" }, async () => {
    try {
      const body = await req.json();
      if (!body.email || !body.password) {
        return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
      }
      const result = await login(body.email, body.password);
      await logAction(result.user.id, "LOGIN", { email: body.email });
      return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
  });
}
