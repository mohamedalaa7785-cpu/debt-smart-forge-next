export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";

/* =========================
   GET CURRENT USER
========================= */
export async function GET(req: Request) {
  try {
    const user = await requireUser(req as any);

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 401 }
    );
  }
}
