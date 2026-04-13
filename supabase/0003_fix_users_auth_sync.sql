-- Fix users table to be compatible with auth sync/upsert flows.
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'collector',
  ADD COLUMN IF NOT EXISTS is_super_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN role SET DEFAULT 'collector',
  ALTER COLUMN is_super_user SET DEFAULT false,
  ALTER COLUMN created_at SET DEFAULT now();

-- Backfill nulls (older rows).
UPDATE public.users
SET role = COALESCE(role, 'collector'),
    is_super_user = COALESCE(is_super_user, false),
    created_at = COALESCE(created_at, now())
WHERE role IS NULL
   OR is_super_user IS NULL
   OR created_at IS NULL;

-- Helpful uniqueness/indexing for robust sync and login lookup.
CREATE UNIQUE INDEX IF NOT EXISTS users_id_uidx ON public.users (id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON public.users (email);

COMMIT;
