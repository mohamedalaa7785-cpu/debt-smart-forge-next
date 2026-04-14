import { LoginBodySchema } from "@/lib/validators/api";
import { AuthError, ValidationError } from "@/server/core/error.handler";
import { createSupabaseServerClient } from "@/server/auth/session.service";
import { getUserById } from "@/server/users/user.service";
import { logAction } from "@/server/services/log.service";
import { logger } from "@/server/core/logger";

export async function loginUser(rawBody: unknown) {
  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationError("Valid email and password are required", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    const msg = error?.message?.toLowerCase() || "invalid auth";
    if (msg.includes("email not confirmed")) {
      throw new AuthError("Email is not confirmed", 403);
    }
    throw new AuthError("Invalid email or password", 401);
  }

  const dbUser = await getUserById(data.user.id);
  if (!dbUser) {
    logger.warn("login_user_missing_in_public_users", { userId: data.user.id, email });
    throw new AuthError("User profile is not synced. Contact support.", 409);
  }

  await logAction(dbUser.id, "LOGIN", { email });
  logger.info("login_success", { userId: dbUser.id, email, role: dbUser.role });

  return dbUser;
}
