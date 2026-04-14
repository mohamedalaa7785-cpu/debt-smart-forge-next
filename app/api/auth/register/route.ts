export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { RegisterBodySchema } from "@/lib/validators/api";

export async function POST(req: Request) {
  const rawBody = await req.json().catch(() => ({}));
  RegisterBodySchema.safeParse(rawBody);

  return NextResponse.json(
    {
      success: false,
      error: "Self registration is temporarily disabled. Please login with your assigned username.",
    },
    { status: 403 }
  );
}
