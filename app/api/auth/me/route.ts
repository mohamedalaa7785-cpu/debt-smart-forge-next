export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/lib/auth";
import { handleApiError } from "@/server/core/error.handler";

export async function GET(_req: Request) {
  try {
    const user = await requireUser();

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
