export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { enforceRateLimit } from "@/server/core/request-security";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:signup", 5);

    const rawBody = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON payload");
    });

    const result = await signupUser(rawBody);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.user.name,
      },
      emailConfirmationRequired: result.emailConfirmationRequired,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
