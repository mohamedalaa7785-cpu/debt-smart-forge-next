import { LoginBodySchema } from "@/lib/validators/api";
import { AuthError, ValidationError } from "@/server/core/error.handler";
import { createSupabaseServerClient } from "@/server/auth/session.service";
import { getUserById, syncAuthUserToPublicUser } from "@/server/users/user.service";
import { logAction } from "@/server/services/log.service";
import { logger } from "@/server/core/logger";
import { normalizeRole } from "@/server/lib/role";

export async function loginUser(rawBody: unknown) {
  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationError("Valid email and password are required", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    throw new AuthError("Invalid email or password", 401);
  }

  const role = normalizeRole(data.user.app_metadata?.role);
  const name = (data.user.user_metadata?.name as string | undefined) || email.split("@")[0] || "User";
  const isSuperUser = Boolean(data.user.app_metadata?.is_super_user);

  await syncAuthUserToPublicUser({
    id: data.user.id,
    email,
    name,
    role,
    isSuperUser,
    username: (data.user.user_metadata?.username as string | undefined) || null,
  });

  const dbUser = await getUserById(data.user.id);
  if (!dbUser) {
    logger.warn("login_user_missing_profile", { userId: data.user.id, email });
    throw new AuthError("User profile is not synced. Contact support.", 409);
  }

  await logAction(dbUser.id, "LOGIN", { email });
  logger.info("login_success", { userId: dbUser.id, email, role: dbUser.role });

  return dbUser;
}
