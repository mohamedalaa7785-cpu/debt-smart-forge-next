-- Final Auth Sync Fix and Schema Alignment
-- This migration ensures public.users and public.profiles are correctly synced with auth.users
-- and that the schema matches the Drizzle ORM expectations.

BEGIN;

-- 1) Ensure user_role enum exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin');
  END IF;
END$$;

-- 2) Align public.users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_super_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure columns exist if table already existed
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'collector',
  ADD COLUMN IF NOT EXISTS is_super_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- 3) Align public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_admin boolean NOT NULL DEFAULT false,
  is_hidden_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Create case-insensitive unique indexes for email and username
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON public.users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_uidx ON public.profiles (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_uidx ON public.profiles (lower(username)) WHERE username IS NOT NULL;

-- 5) Create the sync function
CREATE OR REPLACE FUNCTION public.handle_new_user_sync()
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
  v_is_hidden_admin boolean;
BEGIN
  v_email := lower(NEW.email);
  v_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    split_part(v_email, '@', 1),
    'User'
  );

  -- Determine if super user / hidden admin
  v_is_super_user := COALESCE((NEW.raw_app_meta_data ->> 'is_super_user')::boolean, false);
  
  -- Special case for the owner email mentioned in the repo
  IF v_email = 'mohamed.alaa7785@gmail.com' THEN
    v_is_super_user := true;
    v_is_hidden_admin := true;
    v_role := 'hidden_admin'::public.user_role;
  ELSE
    v_is_hidden_admin := false;
    v_role_text := lower(COALESCE(NEW.raw_app_meta_data ->> 'role', 'collector'));
    v_role := CASE
      WHEN v_role_text IN ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin')
        THEN v_role_text::public.user_role
      ELSE 'collector'::public.user_role
    END;
  END IF;

  -- Sync to public.users
  INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
  VALUES (NEW.id, v_email, v_name, v_role, v_is_super_user, COALESCE(NEW.created_at, now()))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_super_user = EXCLUDED.is_super_user;

  -- Sync to public.profiles
  INSERT INTO public.profiles (
    id, user_id, email, username, full_name, role, is_admin, is_hidden_admin, created_at, updated_at
  )
  VALUES (
    NEW.id, NEW.id, v_email, 
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(v_email, '@', 1)),
    v_name, v_role, 
    (v_role IN ('admin', 'hidden_admin')),
    v_is_hidden_admin,
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_admin = EXCLUDED.is_admin,
        is_hidden_admin = EXCLUDED.is_hidden_admin,
        updatedAt = now();

  RETURN NEW;
END;
$$;

-- 6) Re-create the trigger
DROP TRIGGER IF EXISTS trg_sync_auth_user ON auth.users;
CREATE TRIGGER trg_sync_auth_user
AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_sync();

-- 7) Backfill existing users
INSERT INTO auth.users (id) SELECT id FROM auth.users ON CONFLICT DO NOTHING; -- No-op to trigger backfill if needed manually, but better to just run the function logic

DO $$
DECLARE
  user_row record;
BEGIN
  FOR user_row IN SELECT * FROM auth.users LOOP
    -- We can't easily call the trigger function directly with NEW, so we just perform the logic
    -- or we can just perform a dummy update to trigger it
    UPDATE auth.users SET updated_at = now() WHERE id = user_row.id;
  END LOOP;
END$$;

-- 8) RLS Policies for users and profiles
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
CREATE POLICY "Users can view their own record" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'hidden_admin')
    )
  );

COMMIT;
