-- Debt Smart Forge - Full Supabase Rebuild Script (single-run, no shortcuts)
-- WARNING: This script is destructive for app data in listed tables.
-- It drops and recreates the full runtime schema used by the repository.

BEGIN;

-- =====================================================
-- 0) Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- =====================================================
-- 1) Cleanup old triggers/functions/policies/types
-- =====================================================
DROP TRIGGER IF EXISTS trg_sync_auth_user_to_public_users ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP FUNCTION IF EXISTS public.sync_auth_user_to_public_users() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_my_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;

-- Drop tables in dependency-safe order.
DROP TABLE IF EXISTS public.audit_logs CASCADE;
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
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.domain_type CASCADE;
DROP TYPE IF EXISTS public.portfolio_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- =====================================================
-- 2) Enums
-- =====================================================
CREATE TYPE public.user_role AS ENUM (
  'admin',
  'supervisor',
  'team_leader',
  'collector',
  'hidden_admin'
);

CREATE TYPE public.portfolio_type AS ENUM ('ACTIVE', 'WRITEOFF');
CREATE TYPE public.domain_type AS ENUM ('FIRST', 'THIRD', 'WRITEOFF');

-- =====================================================
-- 3) Tables (aligned with server/db/schema.ts)
-- =====================================================
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  email text,
  name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_super_user boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
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
  result jsonb DEFAULT '{}'::jsonb,
  confidence integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  level text DEFAULT 'low',
  signals jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.client_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  url text NOT NULL,
  public_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_number text,
  case_type text,
  status text,
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

-- =====================================================
-- 4) Indexes (runtime + performance)
-- =====================================================
CREATE UNIQUE INDEX users_email_uidx ON public.users ((lower(email))) WHERE email IS NOT NULL;
CREATE INDEX users_id_email_idx ON public.users (id, email);

CREATE INDEX users_email_idx ON public.users (email);
CREATE INDEX clients_owner_idx ON public.clients (owner_id);
CREATE INDEX clients_team_idx ON public.clients (team_leader_id);
CREATE INDEX clients_created_by_idx ON public.clients (created_by);
CREATE INDEX clients_created_at_idx ON public.clients (created_at);

CREATE INDEX phones_client_idx ON public.client_phones (client_id);
CREATE INDEX addresses_client_idx ON public.client_addresses (client_id);
CREATE INDEX loans_client_idx ON public.client_loans (client_id);
CREATE INDEX actions_client_idx ON public.client_actions (client_id);
CREATE INDEX actions_user_idx ON public.client_actions (user_id);
CREATE INDEX call_logs_client_idx ON public.call_logs (client_id);
CREATE INDEX followups_client_idx ON public.followups (client_id);
CREATE INDEX followups_scheduled_idx ON public.followups (scheduled_for);
CREATE INDEX osint_client_idx ON public.osint_results (client_id);
CREATE INDEX osint_confidence_idx ON public.osint_results (confidence_score);
CREATE INDEX osint_history_client_idx ON public.osint_history (client_id);
CREATE INDEX fraud_client_idx ON public.fraud_analysis (client_id);
CREATE INDEX fraud_score_idx ON public.fraud_analysis (score);
CREATE INDEX legal_cases_client_idx ON public.legal_cases (client_id);
CREATE INDEX audit_logs_user_idx ON public.audit_logs (user_id);
CREATE INDEX audit_logs_client_idx ON public.audit_logs (client_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at);

-- Search/hardening indexes
CREATE INDEX idx_clients_portfolio_domain_created
  ON public.clients (portfolio_type, domain_type, created_at DESC);
CREATE INDEX idx_clients_owner_team_created
  ON public.clients (owner_id, team_leader_id, created_at DESC);
CREATE INDEX idx_client_loans_client_bucket
  ON public.client_loans (client_id, bucket DESC);
CREATE INDEX idx_client_loans_cycle
  ON public.client_loans (cycle);
CREATE INDEX idx_client_loans_loan_number
  ON public.client_loans (loan_number);
CREATE INDEX idx_client_loans_referral_date
  ON public.client_loans (referral_date);
CREATE INDEX idx_client_loans_organization
  ON public.client_loans (organization);

CREATE INDEX idx_clients_name_trgm
  ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_clients_email_trgm
  ON public.clients USING gin (email gin_trgm_ops);
CREATE INDEX idx_clients_company_trgm
  ON public.clients USING gin (company gin_trgm_ops);
CREATE INDEX idx_clients_customer_id_trgm
  ON public.clients USING gin (customer_id gin_trgm_ops);
CREATE INDEX idx_client_phones_phone_trgm
  ON public.client_phones USING gin (phone gin_trgm_ops);
CREATE INDEX idx_client_addresses_text_trgm
  ON public.client_addresses USING gin ((COALESCE(address, '') || ' ' || COALESCE(city, '') || ' ' || COALESCE(area, '')) gin_trgm_ops);
CREATE INDEX idx_client_loans_loan_number_trgm
  ON public.client_loans USING gin (loan_number gin_trgm_ops);
CREATE INDEX idx_clients_notes_referral_fts
  ON public.clients USING gin (to_tsvector('simple', unaccent(COALESCE(notes, '') || ' ' || COALESCE(referral, '') || ' ' || COALESCE(branch, ''))));
CREATE INDEX idx_client_actions_note_result_fts
  ON public.client_actions USING gin (to_tsvector('simple', unaccent(COALESCE(note, '') || ' ' || COALESCE(result, ''))));

-- =====================================================
-- 5) Auth sync guard (prevents "User record not synced")
-- =====================================================
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
  VALUES (NEW.id, v_email, v_name, v_role, v_is_super_user, COALESCE(NEW.created_at, now()))
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      is_super_user = EXCLUDED.is_super_user;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_auth_user_to_public_users
AFTER INSERT OR UPDATE OF email, raw_user_meta_data, raw_app_meta_data
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_auth_user_to_public_users();

-- Backfill all existing auth users.
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

-- =====================================================
-- 6) Data hygiene
-- =====================================================
UPDATE public.client_loans
SET bucket = GREATEST(1, COALESCE(bucket, 1))
WHERE bucket IS NULL OR bucket < 1;

UPDATE public.client_loans
SET cycle = NULL
WHERE cycle IS NOT NULL AND (cycle < 1 OR cycle > 31);

UPDATE public.client_loans
SET will_legal = COALESCE(will_legal, false)
WHERE will_legal IS NULL;

UPDATE public.client_loans
SET amount_due = COALESCE(amount_due, overdue, 0)
WHERE amount_due IS NULL;

-- =====================================================
-- 7) Row Level Security policies
-- =====================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osint_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osint_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS users_select_self ON public.users;
CREATE POLICY users_select_self ON public.users
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.get_my_role() IN ('hidden_admin', 'admin'));

DROP POLICY IF EXISTS users_update_self ON public.users;
CREATE POLICY users_update_self ON public.users
FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.get_my_role() = 'hidden_admin')
WITH CHECK (id = auth.uid() OR public.get_my_role() = 'hidden_admin');

DROP POLICY IF EXISTS clients_select_scoped ON public.clients;
CREATE POLICY clients_select_scoped ON public.clients
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND clients.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND clients.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND clients.team_leader_id = u.id)
        OR clients.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS clients_insert_scoped ON public.clients;
CREATE POLICY clients_insert_scoped ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role IN ('hidden_admin', 'admin')
        OR clients.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS clients_update_scoped ON public.clients;
CREATE POLICY clients_update_scoped ON public.clients
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND clients.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND clients.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND (clients.team_leader_id = u.id OR clients.owner_id = u.id))
        OR clients.owner_id = u.id
      )
  )
)
WITH CHECK (true);

DROP POLICY IF EXISTS clients_delete_admin_only ON public.clients;
CREATE POLICY clients_delete_admin_only ON public.clients
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid() AND u.role IN ('hidden_admin', 'admin')
  )
);

DROP POLICY IF EXISTS child_access_phones ON public.client_phones;
CREATE POLICY child_access_phones ON public.client_phones
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_phones.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_phones.client_id));

DROP POLICY IF EXISTS child_access_addresses ON public.client_addresses;
CREATE POLICY child_access_addresses ON public.client_addresses
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_addresses.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_addresses.client_id));

DROP POLICY IF EXISTS child_access_loans ON public.client_loans;
CREATE POLICY child_access_loans ON public.client_loans
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_loans.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_loans.client_id));

DROP POLICY IF EXISTS child_access_actions ON public.client_actions;
CREATE POLICY child_access_actions ON public.client_actions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_actions.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_actions.client_id));

DROP POLICY IF EXISTS child_access_call_logs ON public.call_logs;
CREATE POLICY child_access_call_logs ON public.call_logs
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = call_logs.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = call_logs.client_id));

DROP POLICY IF EXISTS child_access_followups ON public.followups;
CREATE POLICY child_access_followups ON public.followups
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = followups.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = followups.client_id));

DROP POLICY IF EXISTS child_access_osint_results ON public.osint_results;
CREATE POLICY child_access_osint_results ON public.osint_results
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = osint_results.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = osint_results.client_id));

DROP POLICY IF EXISTS child_access_osint_history ON public.osint_history;
CREATE POLICY child_access_osint_history ON public.osint_history
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = osint_history.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = osint_history.client_id));

DROP POLICY IF EXISTS child_access_fraud ON public.fraud_analysis;
CREATE POLICY child_access_fraud ON public.fraud_analysis
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = fraud_analysis.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = fraud_analysis.client_id));

DROP POLICY IF EXISTS child_access_images ON public.client_images;
CREATE POLICY child_access_images ON public.client_images
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_images.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_images.client_id));

DROP POLICY IF EXISTS child_access_legal ON public.legal_cases;
CREATE POLICY child_access_legal ON public.legal_cases
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = legal_cases.client_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = legal_cases.client_id));

DROP POLICY IF EXISTS audit_logs_select_privileged ON public.audit_logs;
CREATE POLICY audit_logs_select_privileged ON public.audit_logs
FOR SELECT TO authenticated
USING (public.get_my_role() IN ('hidden_admin', 'admin', 'supervisor'));

COMMIT;
