-- Debt Smart Forge - Full Supabase Reset / Clean Rebuild
-- Date: 2026-05-10
--
-- HOW TO USE:
-- 1) Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
-- 2) This resets application tables in public only. It does NOT delete auth.users.
-- 3) Existing Supabase Auth users are backfilled into public.users and public.profiles.
-- 4) If you also want to delete Auth users, do it separately from Authentication UI/API.
--
-- WARNING: destructive for the listed public application tables.

BEGIN;

-- =====================================================
-- 0) Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1) Drop old app triggers/functions/tables/types
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_sync_public_identity ON auth.users;
DROP TRIGGER IF EXISTS trg_sync_auth_user_to_public_users ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user_to_public_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_user() CASCADE;
DROP FUNCTION IF EXISTS public.can_access_client(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.log_client_assignment() CASCADE;

-- Dependency-safe table cleanup. Keep Supabase-managed auth/storage schemas intact.
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.intelligence CASCADE;
DROP TABLE IF EXISTS public.admin_users CASCADE;
DROP TABLE IF EXISTS public.collections CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.debts CASCADE;
DROP TABLE IF EXISTS public.attachments CASCADE;
DROP TABLE IF EXISTS public.risk_scores CASCADE;
DROP TABLE IF EXISTS public.assignments CASCADE;
DROP TABLE IF EXISTS public.client_notes CASCADE;
DROP TABLE IF EXISTS public.legal_cases CASCADE;
DROP TABLE IF EXISTS public.fraud_analysis CASCADE;
DROP TABLE IF EXISTS public.osint_history CASCADE;
DROP TABLE IF EXISTS public.osint_results CASCADE;
DROP TABLE IF EXISTS public.followups CASCADE;
DROP TABLE IF EXISTS public.call_logs CASCADE;
DROP TABLE IF EXISTS public.client_actions CASCADE;
DROP TABLE IF EXISTS public.client_loans CASCADE;
DROP TABLE IF EXISTS public.client_addresses CASCADE;
DROP TABLE IF EXISTS public.client_phones CASCADE;
DROP TABLE IF EXISTS public.client_images CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.import_batches CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.domain_type CASCADE;
DROP TYPE IF EXISTS public.portfolio_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- =====================================================
-- 2) Enums
-- =====================================================
CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin');
CREATE TYPE public.portfolio_type AS ENUM ('ACTIVE', 'WRITEOFF');
CREATE TYPE public.domain_type AS ENUM ('FIRST', 'THIRD', 'WRITEOFF');

-- =====================================================
-- 3) Core auth mirror tables
-- =====================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_super_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  full_name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_admin boolean NOT NULL DEFAULT false,
  is_hidden_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_not_email CHECK (username IS NULL OR position('@' in username) = 0)
);

-- =====================================================
-- 4) Runtime CRM tables aligned with server/db/schema.ts
-- =====================================================
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  source text,
  raw_data_url text,
  status text DEFAULT 'pending',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text UNIQUE,
  name text NOT NULL,
  email text,
  company text,
  image_url text,
  notes text,
  referral text,
  referral_text text,
  referral_image_url text,
  status text DEFAULT 'NEW',
  import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL,
  owner_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  team_leader_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  portfolio_type public.portfolio_type NOT NULL DEFAULT 'ACTIVE',
  domain_type public.domain_type NOT NULL DEFAULT 'FIRST',
  branch text,
  cycle_start_date timestamptz,
  cycle_end_date timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  intelligence_id uuid,
  storage_path text NOT NULL,
  title text,
  mime_type text,
  size_bytes integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  embedding vector(512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  address text NOT NULL,
  city text,
  area text,
  lat numeric(10,6),
  lng numeric(10,6),
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  loan_type text NOT NULL,
  loan_number text,
  cycle integer,
  organization text,
  will_legal boolean DEFAULT false,
  referral_date timestamptz,
  collector_percentage numeric(6,2),
  emi numeric(12,2),
  balance numeric(12,2),
  overdue numeric(12,2),
  amount_due numeric(12,2),
  bucket integer DEFAULT 1,
  penalty_enabled boolean DEFAULT false,
  penalty_amount numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer NOT NULL,
  reason text,
  category text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  category text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.client_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  action_type text NOT NULL DEFAULT 'NOTE',
  note text,
  result text,
  amount_paid numeric(12,2),
  next_action_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text,
  duration_sec integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  note text,
  done boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.osint_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  social jsonb DEFAULT '[]'::jsonb,
  workplace jsonb DEFAULT '[]'::jsonb,
  web_results jsonb DEFAULT '[]'::jsonb,
  image_results jsonb DEFAULT '[]'::jsonb,
  maps_results jsonb DEFAULT '[]'::jsonb,
  summary text,
  confidence_score integer DEFAULT 0,
  risk_level text DEFAULT 'low',
  fraud_flags jsonb DEFAULT '[]'::jsonb,
  last_analyzed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.osint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  query text,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer NOT NULL,
  level text NOT NULL,
  signals jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_number text,
  case_type text,
  status text DEFAULT 'pending',
  last_update text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Optional SaaS/domain tables from historical Supabase scripts.
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  principal_amount numeric(12,2) NOT NULL DEFAULT 0,
  outstanding_amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'open',
  due_date date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT current_date,
  payment_method text,
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  debt_id uuid NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES public.users(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'new',
  priority smallint NOT NULL DEFAULT 3,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  role public.user_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  score numeric(5,2),
  summary text,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents
  ADD CONSTRAINT documents_intelligence_id_fkey
  FOREIGN KEY (intelligence_id) REFERENCES public.intelligence(id) ON DELETE SET NULL;

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  lat double precision,
  lng double precision,
  address text,
  city text,
  area text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_secret boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, key)
);

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.user_role NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  UNIQUE (role, resource, action)
);

-- =====================================================
-- 5) Indexes
-- =====================================================
CREATE INDEX users_email_idx ON public.users(email);
CREATE UNIQUE INDEX users_email_uidx ON public.users(lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX profiles_user_id_uidx ON public.profiles(user_id);
CREATE UNIQUE INDEX profiles_email_uidx ON public.profiles(lower(email));
CREATE UNIQUE INDEX profiles_username_uidx ON public.profiles(lower(username)) WHERE username IS NOT NULL;

CREATE INDEX clients_owner_idx ON public.clients(owner_id);
CREATE INDEX clients_team_idx ON public.clients(team_leader_id);
CREATE INDEX clients_created_by_idx ON public.clients(created_by);
CREATE INDEX clients_created_at_idx ON public.clients(created_at DESC);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_clients_email ON public.clients(email) WHERE email IS NOT NULL;
CREATE INDEX clients_name_trgm_idx ON public.clients USING gin (name gin_trgm_ops);

CREATE INDEX documents_owner_idx ON public.documents(owner_user_id);
CREATE INDEX documents_client_idx ON public.documents(client_id);
CREATE INDEX documents_embedding_ivfflat_idx ON public.documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX phones_client_idx ON public.client_phones(client_id);
CREATE INDEX client_phones_phone_trgm_idx ON public.client_phones USING gin (phone gin_trgm_ops);
CREATE INDEX addresses_client_idx ON public.client_addresses(client_id);
CREATE INDEX loans_client_idx ON public.client_loans(client_id);
CREATE INDEX idx_client_loans_client_bucket ON public.client_loans(client_id, bucket DESC);
CREATE INDEX idx_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_assignments_owner_id ON public.assignments(owner_id);
CREATE INDEX idx_risk_scores_client_id ON public.risk_scores(client_id);
CREATE INDEX idx_attachments_client_id ON public.attachments(client_id);
CREATE INDEX actions_client_idx ON public.client_actions(client_id);
CREATE INDEX actions_user_idx ON public.client_actions(user_id);
CREATE INDEX call_logs_client_idx ON public.call_logs(client_id);
CREATE INDEX followups_client_idx ON public.followups(client_id);
CREATE INDEX followups_scheduled_idx ON public.followups(scheduled_for);
CREATE INDEX osint_client_idx ON public.osint_results(client_id);
CREATE INDEX osint_confidence_idx ON public.osint_results(confidence_score);
CREATE INDEX osint_history_client_idx ON public.osint_history(client_id);
CREATE INDEX fraud_client_idx ON public.fraud_analysis(client_id);
CREATE INDEX legal_client_idx ON public.legal_cases(client_id);
CREATE INDEX audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX audit_logs_client_id_idx ON public.audit_logs(client_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

CREATE INDEX debts_owner_idx ON public.debts(owner_user_id);
CREATE INDEX debts_client_idx ON public.debts(client_id);
CREATE INDEX payments_owner_idx ON public.payments(owner_user_id);
CREATE INDEX payments_debt_idx ON public.payments(debt_id);
CREATE INDEX collections_owner_idx ON public.collections(owner_user_id);
CREATE INDEX collections_debt_idx ON public.collections(debt_id);
CREATE INDEX intelligence_owner_idx ON public.intelligence(owner_user_id);
CREATE INDEX intelligence_client_idx ON public.intelligence(client_id);
CREATE INDEX locations_owner_idx ON public.locations(owner_user_id);
CREATE INDEX locations_client_idx ON public.locations(client_id);
CREATE INDEX settings_owner_idx ON public.settings(owner_user_id);

-- =====================================================
-- 6) Helper functions + triggers
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
  v_name text;
  v_username text;
  v_role public.user_role;
  v_is_super_user boolean;
BEGIN
  v_email := lower(coalesce(NEW.email, ''));
  v_name := coalesce(nullif(trim(coalesce(NEW.raw_user_meta_data->>'name', '')), ''), split_part(v_email, '@', 1), 'User');
  v_username := nullif(lower(trim(coalesce(NEW.raw_user_meta_data->>'username', ''))), '');
  v_is_super_user := coalesce((NEW.raw_app_meta_data->>'is_super_user')::boolean, false);
  v_role := coalesce((NEW.raw_app_meta_data->>'role')::public.user_role, CASE WHEN v_is_super_user THEN 'hidden_admin'::public.user_role ELSE 'collector'::public.user_role END);

  IF v_is_super_user THEN
    v_role := 'hidden_admin';
  END IF;

  INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
  VALUES (NEW.id, v_email, v_name, v_role, v_is_super_user, coalesce(NEW.created_at, now()))
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_super_user = EXCLUDED.is_super_user;

  INSERT INTO public.profiles (id, user_id, email, username, full_name, role, is_admin, is_hidden_admin)
  VALUES (NEW.id, NEW.id, v_email, v_username, v_name, v_role, v_role IN ('admin', 'hidden_admin'), v_role = 'hidden_admin')
  ON CONFLICT (user_id) DO UPDATE
    SET id = EXCLUDED.id,
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        is_admin = EXCLUDED.is_admin,
        is_hidden_admin = EXCLUDED.is_hidden_admin,
        updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_sync_public_identity
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid()), 'collector'::public.user_role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_my_role() IN ('admin', 'hidden_admin');
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(target_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = target_client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND (c.team_leader_id = u.id OR c.owner_id = u.id))
        OR c.owner_id = u.id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.log_client_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
    INSERT INTO public.assignments (client_id, owner_id, assigned_by)
    VALUES (NEW.id, NEW.owner_id, auth.uid())
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER documents_set_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER debts_set_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER collections_set_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER intelligence_set_updated_at BEFORE UPDATE ON public.intelligence FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_log_assignment AFTER INSERT OR UPDATE OF owner_id ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_client_assignment();

-- =====================================================
-- 7) Backfill existing Supabase Auth users
-- =====================================================
INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
SELECT
  u.id,
  lower(u.email),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', '')), ''), split_part(lower(u.email), '@', 1), 'User'),
  coalesce((u.raw_app_meta_data->>'role')::public.user_role, CASE WHEN coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false) THEN 'hidden_admin'::public.user_role ELSE 'collector'::public.user_role END),
  coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false),
  coalesce(u.created_at, now())
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_super_user = EXCLUDED.is_super_user;

INSERT INTO public.profiles (id, user_id, email, username, full_name, role, is_admin, is_hidden_admin)
SELECT
  u.id,
  u.id,
  lower(u.email),
  nullif(lower(trim(coalesce(u.raw_user_meta_data->>'username', ''))), ''),
  coalesce(nullif(trim(coalesce(u.raw_user_meta_data->>'name', '')), ''), split_part(lower(u.email), '@', 1), 'User'),
  coalesce((u.raw_app_meta_data->>'role')::public.user_role, CASE WHEN coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false) THEN 'hidden_admin'::public.user_role ELSE 'collector'::public.user_role END),
  coalesce((u.raw_app_meta_data->>'role')::public.user_role, 'collector'::public.user_role) IN ('admin', 'hidden_admin') OR coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false),
  coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false)
FROM auth.users u
ON CONFLICT (user_id) DO UPDATE
  SET id = EXCLUDED.id,
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      is_admin = EXCLUDED.is_admin,
      is_hidden_admin = EXCLUDED.is_hidden_admin,
      updated_at = now();

-- =====================================================
-- 8) RLS policies
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osint_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own_or_admin ON public.users FOR SELECT TO authenticated
USING (id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY profiles_update_own_safe_fields ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
  AND is_admin = (SELECT p.is_admin FROM public.profiles p WHERE p.user_id = auth.uid())
  AND is_hidden_admin = (SELECT p.is_hidden_admin FROM public.profiles p WHERE p.user_id = auth.uid())
);

CREATE POLICY clients_select_scoped ON public.clients FOR SELECT TO authenticated
USING (public.can_access_client(id));

CREATE POLICY clients_insert_authenticated ON public.clients FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY clients_update_scoped ON public.clients FOR UPDATE TO authenticated
USING (public.can_access_client(id))
WITH CHECK (true);

CREATE POLICY clients_delete_admin_only ON public.clients FOR DELETE TO authenticated
USING (public.get_my_role() IN ('admin', 'hidden_admin'));

CREATE POLICY import_batches_admin ON public.import_batches FOR ALL TO authenticated
USING (public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'))
WITH CHECK (public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY audit_logs_select_privileged ON public.audit_logs FOR SELECT TO authenticated
USING (public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY audit_logs_insert_authenticated ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Child tables follow parent client visibility.
CREATE POLICY child_client_phones_access ON public.client_phones FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_client_addresses_access ON public.client_addresses FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_client_loans_access ON public.client_loans FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_client_notes_access ON public.client_notes FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_assignments_access ON public.assignments FOR ALL TO authenticated
USING (owner_id = auth.uid() OR assigned_by = auth.uid() OR public.can_access_client(client_id))
WITH CHECK (owner_id = auth.uid() OR assigned_by = auth.uid() OR public.can_access_client(client_id));
CREATE POLICY child_risk_scores_access ON public.risk_scores FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_attachments_access ON public.attachments FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_client_actions_access ON public.client_actions FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_call_logs_access ON public.call_logs FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_followups_access ON public.followups FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_osint_results_access ON public.osint_results FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_osint_history_access ON public.osint_history FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_fraud_analysis_access ON public.fraud_analysis FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_legal_cases_access ON public.legal_cases FOR ALL TO authenticated
USING (public.can_access_client(client_id)) WITH CHECK (public.can_access_client(client_id));
CREATE POLICY child_documents_access ON public.documents FOR ALL TO authenticated
USING (client_id IS NULL OR public.can_access_client(client_id) OR owner_user_id = auth.uid())
WITH CHECK (client_id IS NULL OR public.can_access_client(client_id) OR owner_user_id = auth.uid());

-- SaaS/domain tables: owner access + privileged access.
CREATE POLICY debts_owner_or_admin ON public.debts FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY payments_owner_or_admin ON public.payments FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY collections_owner_or_admin ON public.collections FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR assigned_to = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR assigned_to = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY admin_users_admin_only ON public.admin_users FOR ALL TO authenticated
USING (public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY intelligence_owner_or_client ON public.intelligence FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR client_id IS NULL OR public.can_access_client(client_id) OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR client_id IS NULL OR public.can_access_client(client_id) OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY locations_owner_or_client ON public.locations FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR client_id IS NULL OR public.can_access_client(client_id) OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR client_id IS NULL OR public.can_access_client(client_id) OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY settings_owner_or_admin ON public.settings FOR ALL TO authenticated
USING (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (owner_user_id = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin'));
CREATE POLICY permissions_read_all ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY permissions_admin_write ON public.permissions FOR ALL TO authenticated
USING (public.get_my_role() IN ('admin', 'hidden_admin'))
WITH CHECK (public.get_my_role() IN ('admin', 'hidden_admin'));

-- =====================================================
-- 9) Storage bucket used by server/services/image-intelligence.service.ts
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- 10) Seed default role permissions
-- =====================================================
INSERT INTO public.permissions (role, resource, action) VALUES
  ('hidden_admin', '*', '*'),
  ('admin', 'clients', 'read'),
  ('admin', 'clients', 'write'),
  ('admin', 'clients', 'delete'),
  ('supervisor', 'writeoff_clients', 'read'),
  ('supervisor', 'reports', 'read'),
  ('team_leader', 'team_clients', 'read'),
  ('team_leader', 'team_clients', 'write'),
  ('collector', 'assigned_clients', 'read'),
  ('collector', 'assigned_clients', 'write')
ON CONFLICT (role, resource, action) DO NOTHING;

COMMIT;
