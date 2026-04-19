import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    success: true,
    status: "ok",
    service: "debt-smart-os",
    now: new Date().toISOString(),
  });
}
