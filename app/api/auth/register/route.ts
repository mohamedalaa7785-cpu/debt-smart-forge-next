import { NextResponse } from "next/server";
import { register } from "@/server/services/auth.service";
import { logAction } from "@/server/services/log.service";

/* =========================
   REGISTER
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

    const user = await register(
      body.email,
      body.password,
      body.role === "admin" ? "admin" : "agent"
    );

    await logAction(user.id, "REGISTER", {
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Registration failed" },
      { status: 400 }
    );
  }
}
