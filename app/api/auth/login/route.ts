export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/login.service";
import { handleApiError, ValidationError } from "@/server/core/error.handler";
import { LoginBodySchema } from "@/lib/validators/api";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = LoginBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      throw new ValidationError("Valid email and password are required");
    }

    const dbUser = await loginUser(parsed.data);

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.name,
        is_super_user: Boolean(dbUser.isSuperUser),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
