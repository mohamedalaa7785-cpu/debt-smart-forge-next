import { NextResponse } from "next/server";
import { login } from "@/server/services/auth.service";
import { logAction } from "@/server/services/log.service";

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

    const res = NextResponse.json({
      success: true,
      data: result,
    });

    res.cookies.set("token", result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
