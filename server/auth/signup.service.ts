import { RegisterBodySchema } from "@/lib/validators/api";
import { logger } from "@/server/core/logger";
import { AuthError, ValidationError } from "@/server/core/error.handler";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/auth/session.service";
import { isSuperUserEmail, resolveRoleByEmail } from "@/server/lib/role";
import { syncAuthUserToPublicUser } from "@/server/users/user.service";
import { logAction } from "@/server/services/log.service";

function normalizeUsername(username?: string | null) {
  if (!username) return null;
  const normalized = username.trim().toLowerCase();
  if (!normalized) return null;
  return normalized;
}

export async function signupUser(rawBody: unknown) {
  const parsed = RegisterBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationError("Invalid registration payload", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const password = parsed.data.password;
  const username = normalizeUsername(parsed.data.username);
  const name = parsed.data.name?.trim() || username || email.split("@")[0] || "User";
  const isSuperUser = isSuperUserEmail(email);
  const role = isSuperUser ? "hidden_admin" : resolveRoleByEmail(email);

  if (username && username.includes("@")) {
    throw new ValidationError("Username cannot be an email");
  }

  const adminClient = createSupabaseAdminClient();
  const client = createSupabaseServerClient();

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, username },
    app_metadata: { role, is_super_user: isSuperUser },
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() || "signup failed";
    if (msg.includes("already") || msg.includes("duplicate")) {
      throw new ValidationError("Email already registered");
    }
    throw new AuthError("Signup failed", 400);
  }

  const { data: signInData } = await client.auth.signInWithPassword({ email, password });

  const syncedUser = await syncAuthUserToPublicUser({
    id: data.user.id,
    email,
    name,
    role,
    isSuperUser,
    username,
  });

  await logAction(syncedUser.id, "SIGNUP", { email, username });
  logger.info("signup_success", { userId: syncedUser.id, email, role, username });

  return {
    user: syncedUser,
    emailConfirmationRequired: !signInData.session,
  };
}
