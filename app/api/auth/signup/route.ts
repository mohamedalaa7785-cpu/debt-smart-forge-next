export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Self registration is temporarily disabled. Please login with your assigned username.",
    },
    { status: 403 }
  );
}
