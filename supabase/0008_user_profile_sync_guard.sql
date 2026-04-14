-- Ensure auth.users and public.users stay in sync for this app.
-- Safe to run multiple times (idempotent).

BEGIN;

-- 1) Make sure enum exists (for environments created without full migrations).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'user_role'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.user_role AS ENUM (
      'admin',
      'supervisor',
      'team_leader',
      'collector',
      'hidden_admin'
    );
  END IF;
END$$;

-- 2) Ensure required columns/defaults exist.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role public.user_role,
  ADD COLUMN IF NOT EXISTS is_super_user boolean,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'collector',
  ALTER COLUMN is_super_user SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.users
SET
  role = COALESCE(role, 'collector'::public.user_role),
  is_super_user = COALESCE(is_super_user, false),
  created_at = COALESCE(created_at, now()),
  email = CASE WHEN email IS NULL THEN NULL ELSE lower(email) END
WHERE role IS NULL
   OR is_super_user IS NULL
   OR created_at IS NULL
   OR (email IS NOT NULL AND email <> lower(email));

ALTER TABLE public.users
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL;

-- 3) Match app lookup behavior (case-insensitive email uniqueness).
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON public.users ((lower(email))) WHERE email IS NOT NULL;

-- 4) Trigger to auto-sync any new/updated auth user into public.users.
CREATE OR REPLACE FUNCTION public.sync_auth_user_to_public_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_name text;
  v_role_text text;
  v_role public.user_role;
  v_is_super_user boolean;
BEGIN
  v_email := CASE WHEN NEW.email IS NULL THEN NULL ELSE lower(NEW.email) END;
  v_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    CASE WHEN v_email IS NULL THEN 'User' ELSE split_part(v_email, '@', 1) END,
    'User'
  );

  v_role_text := lower(COALESCE(NEW.raw_app_meta_data ->> 'role', 'collector'));

  v_role := CASE
    WHEN v_role_text IN ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin')
      THEN v_role_text::public.user_role
    ELSE 'collector'::public.user_role
  END;

  v_is_super_user := COALESCE((NEW.raw_app_meta_data ->> 'is_super_user')::boolean, false);

  INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
  VALUES (NEW.id, v_email, v_name, v_role, v_is_super_user, NOW())
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_super_user = EXCLUDED.is_super_user;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_auth_user_to_public_users ON auth.users;

CREATE TRIGGER trg_sync_auth_user_to_public_users
AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public_users();

-- 5) Backfill any existing auth users that are missing in public.users.
INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
SELECT
  au.id,
  CASE WHEN au.email IS NULL THEN NULL ELSE lower(au.email) END AS email,
  COALESCE(
    au.raw_user_meta_data ->> 'name',
    CASE WHEN au.email IS NULL THEN 'User' ELSE split_part(lower(au.email), '@', 1) END,
    'User'
  ) AS name,
  CASE
    WHEN lower(COALESCE(au.raw_app_meta_data ->> 'role', 'collector')) IN ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin')
      THEN lower(COALESCE(au.raw_app_meta_data ->> 'role', 'collector'))::public.user_role
    ELSE 'collector'::public.user_role
  END AS role,
  COALESCE((au.raw_app_meta_data ->> 'is_super_user')::boolean, false) AS is_super_user,
  COALESCE(au.created_at, now()) AS created_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_super_user = EXCLUDED.is_super_user;

COMMIT;
