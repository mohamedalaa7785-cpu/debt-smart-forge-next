export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { RegisterBodySchema } from "@/lib/validators/api";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { enforceRateLimit } from "@/server/core/request-security";

export async function POST(request: NextRequest) {
  try {
    enforceRateLimit(request, "auth:register", 5);

    const rawBody = await request.json().catch(() => {
      throw new ValidationError("Invalid JSON payload");
    });

    const parsed = RegisterBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid registration payload" }, { status: 400 });
    }

    const result = await signupUser(parsed.data);

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
