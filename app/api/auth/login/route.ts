export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loginUser } from "@/server/auth/login.service";
import { handleApiError } from "@/server/core/error.handler";
import { enforceRateLimit } from "@/server/core/distributed-cache";
import { getRequestIp } from "@/server/lib/request";

export async function POST(request: Request) {
  try {
    const ip = getRequestIp(request);
    await enforceRateLimit(`auth:login:${ip}`, 10, 60);

    const rawBody = await request.json();
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
