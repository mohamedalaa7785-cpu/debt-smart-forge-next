export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError } from "@/server/core/error.handler";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const result = await signupUser(rawBody);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        is_super_user: Boolean(result.user.isSuperUser),
      },
      emailConfirmationRequired: result.emailConfirmationRequired,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
