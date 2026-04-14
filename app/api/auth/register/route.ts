export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { signupUser } from "@/server/auth/signup.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { RegisterBodySchema } from "@/lib/validators/api";

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parsed = RegisterBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError("Invalid registration payload");
    }

    const result = await signupUser(parsed.data);

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
