import { NextResponse } from "next/server";
import { withAuth, isAdmin } from "@/server/lib/auth";
import { checkDb } from "@/server/db";
import { ForbiddenError, handleApiError } from "@/server/core/error.handler";

export const runtime = "nodejs";

export async function GET() {
  return withAuth(async (user) => {
    try {
      if (!isAdmin(user)) {
        throw new ForbiddenError();
      }

      const dbOk = await checkDb();

      return NextResponse.json({
        success: true,
        status: dbOk ? "ok" : "degraded",
        checks: {
          database: dbOk,
          supabaseAuthEnv: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          supabaseServiceRoleEnv: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
          openaiEnv: Boolean(process.env.OPENAI_API_KEY),
          serpApiEnv: Boolean(process.env.SERPAPI_API_KEY),
          imageBucket: process.env.SUPABASE_IMAGE_BUCKET || "client-documents",
        },
      });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
