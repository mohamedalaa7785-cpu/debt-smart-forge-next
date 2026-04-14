export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { RegisterBodySchema } from "@/lib/validators/api";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError } from "@/server/core/error.handler";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json().catch(() => ({}));
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
