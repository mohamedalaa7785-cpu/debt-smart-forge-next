import { LoginBodySchema } from "@/lib/validators/api";
import { AuthError, ValidationError } from "@/server/core/error.handler";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/server/auth/session.service";
import { getUserById, syncAuthUserToPublicUser } from "@/server/users/user.service";
import { logAction } from "@/server/services/log.service";
import { logger } from "@/server/core/logger";
import { getPredefinedUserByIdentifier, listPredefinedUsernames } from "@/server/auth/predefined-users";

async function loginWithEmail(email: string, password: string) {
  const supabase = createSupabaseServerClient();
  return supabase.auth.signInWithPassword({ email, password });
}

async function autoProvisionPredefinedUser(email: string, password: string, name: string, role: string) {
  const admin = createSupabaseAdminClient();
  return admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role, is_super_user: role === "hidden_admin" },
  });
}

export async function loginUser(rawBody: unknown) {
  const parsed = LoginBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    throw new ValidationError("Valid username and password are required", {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const identifier = parsed.data.identifier.trim();
  const password = parsed.data.password;

  const predefinedUser = getPredefinedUserByIdentifier(identifier);
  if (!predefinedUser) {
    throw new AuthError(`Unknown username. Allowed users: ${listPredefinedUsernames().join(", ")}`, 401);
  }

  const email = predefinedUser.email;
  let { data, error } = await loginWithEmail(email, password);

  if (error || !data.session || !data.user) {
    const provision = await autoProvisionPredefinedUser(email, password, predefinedUser.name, predefinedUser.role);

    if (provision.error) {
      const msg = provision.error.message?.toLowerCase() || "invalid auth";
      if (msg.includes("already") || msg.includes("exists")) {
        throw new AuthError("Invalid username or password", 401);
      }
      throw new AuthError("Unable to create account for this user", 400);
    }

    const retry = await loginWithEmail(email, password);
    data = retry.data;
    error = retry.error;
  }

  if (error || !data.session || !data.user) {
    throw new AuthError("Invalid username or password", 401);
  }

  await syncAuthUserToPublicUser({
    id: data.user.id,
    email,
    name: predefinedUser.name,
    role: predefinedUser.role,
    isSuperUser: predefinedUser.role === "hidden_admin",
  });

  const dbUser = await getUserById(data.user.id);
  if (!dbUser) {
    logger.warn("login_user_missing_in_public_users", { userId: data.user.id, email });
    throw new AuthError("User profile is not synced. Contact support.", 409);
  }

  await logAction(dbUser.id, "LOGIN", { identifier, email });
  logger.info("login_success", { userId: dbUser.id, email, role: dbUser.role, identifier });

  return dbUser;
}
