export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError } from "@/server/core/error.handler";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
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
