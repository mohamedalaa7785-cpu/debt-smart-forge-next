export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/server/auth/login.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { enforceRateLimit } from "@/server/core/request-security";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:login", 10);

    const rawBody = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON payload");
    });

    const user = await loginUser(rawBody);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        is_super_user: Boolean(user.isSuperUser),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
