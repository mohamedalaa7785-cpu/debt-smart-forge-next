-- Idempotent guard-rail migration for Debt Smart OS
-- Safe to run multiple times in Supabase SQL editor.

create extension if not exists pgcrypto;

-- 1) Ensure core enums exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin','supervisor','team_leader','collector','hidden_admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portfolio_type') THEN
    CREATE TYPE public.portfolio_type AS ENUM ('ACTIVE','WRITEOFF');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domain_type') THEN
    CREATE TYPE public.domain_type AS ENUM ('FIRST','THIRD','WRITEOFF');
  END IF;
END $$;

-- 2) Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  username text,
  full_name text,
  role public.user_role not null default 'collector',
  is_admin boolean not null default false,
  is_hidden_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id uuid default gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS role public.user_role default 'collector',
  ADD COLUMN IF NOT EXISTS is_admin boolean default false,
  ADD COLUMN IF NOT EXISTS is_hidden_admin boolean default false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz default now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

-- 3) Ensure key columns exist on clients and child tables
ALTER TABLE IF EXISTS public.clients
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS referral text,
  ADD COLUMN IF NOT EXISTS portfolio_type public.portfolio_type default 'ACTIVE',
  ADD COLUMN IF NOT EXISTS domain_type public.domain_type default 'FIRST',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();

ALTER TABLE IF EXISTS public.client_phones
  ADD COLUMN IF NOT EXISTS is_primary boolean default false;

ALTER TABLE IF EXISTS public.client_addresses
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS is_primary boolean default false;

ALTER TABLE IF EXISTS public.client_loans
  ADD COLUMN IF NOT EXISTS loan_number text,
  ADD COLUMN IF NOT EXISTS cycle integer,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS will_legal boolean default false,
  ADD COLUMN IF NOT EXISTS referral_date timestamptz,
  ADD COLUMN IF NOT EXISTS collector_percentage numeric(6,2),
  ADD COLUMN IF NOT EXISTS overdue numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_due numeric(12,2);

-- 4) Helpful indexes (guarded by column existence)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='name') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS clients_name_idx ON public.clients (name)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='email') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS clients_email_idx ON public.clients (email)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='owner_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS clients_owner_id_idx ON public.clients (owner_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='clients' AND column_name='created_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS clients_created_at_idx ON public.clients (created_at)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='client_phones' AND column_name='client_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS client_phones_client_id_idx ON public.client_phones (client_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='client_addresses' AND column_name='client_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS client_addresses_client_id_idx ON public.client_addresses (client_id)';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='client_loans' AND column_name='client_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS client_loans_client_id_idx ON public.client_loans (client_id)';
  END IF;
END $$;

-- 5) Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;

-- 6) Helper function to check admin role from profiles
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND (p.role IN ('admin','hidden_admin') OR p.is_admin = true OR p.is_hidden_admin = true)
  );
$$;

-- 7) Policies (drop/recreate safely)
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self ON public.profiles
FOR SELECT USING (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self ON public.profiles
FOR UPDATE USING (user_id = auth.uid() OR public.is_admin_user())
WITH CHECK (user_id = auth.uid() OR public.is_admin_user());

DROP POLICY IF EXISTS clients_select_policy ON public.clients;
CREATE POLICY clients_select_policy ON public.clients
FOR SELECT USING (
  public.is_admin_user() OR owner_id = auth.uid() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS clients_insert_policy ON public.clients;
CREATE POLICY clients_insert_policy ON public.clients
FOR INSERT WITH CHECK (
  public.is_admin_user() OR created_by = auth.uid() OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS clients_update_policy ON public.clients;
CREATE POLICY clients_update_policy ON public.clients
FOR UPDATE USING (
  public.is_admin_user() OR owner_id = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  public.is_admin_user() OR owner_id = auth.uid() OR created_by = auth.uid()
);

DROP POLICY IF EXISTS clients_delete_policy ON public.clients;
CREATE POLICY clients_delete_policy ON public.clients
FOR DELETE USING (public.is_admin_user() OR created_by = auth.uid());

DROP POLICY IF EXISTS client_phones_access_policy ON public.client_phones;
CREATE POLICY client_phones_access_policy ON public.client_phones
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_phones.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_phones.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS client_addresses_access_policy ON public.client_addresses;
CREATE POLICY client_addresses_access_policy ON public.client_addresses
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_addresses.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_addresses.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
);

DROP POLICY IF EXISTS client_loans_access_policy ON public.client_loans;
CREATE POLICY client_loans_access_policy ON public.client_loans
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_loans.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = client_loans.client_id
      AND (public.is_admin_user() OR c.owner_id = auth.uid() OR c.created_by = auth.uid())
  )
);
