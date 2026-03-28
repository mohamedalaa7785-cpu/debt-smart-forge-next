import { NextResponse } from "next/server";
import { login } from "@/server/services/auth.service";
import { logAction } from "@/server/services/log.service";

/* =========================
   LOGIN
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.email || !body.password) {
      return NextResponse.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    const result = await login(body.email, body.password);

    await logAction(result.user.id, "LOGIN", {
      email: body.email,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
