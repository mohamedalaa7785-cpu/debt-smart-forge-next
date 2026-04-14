-- Remove auth.users sync triggers in favor of explicit API sync.
DO $$
DECLARE
  trigger_row record;
BEGIN
  FOR trigger_row IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth'
      AND event_object_table = 'users'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', trigger_row.trigger_name);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user() CASCADE;

-- Ensure users table has the required columns and strong sync constraints.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'collector',
  ADD COLUMN IF NOT EXISTS is_super_user boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON public.users ((lower(email)));
CREATE INDEX IF NOT EXISTS users_id_email_idx ON public.users (id, email);
