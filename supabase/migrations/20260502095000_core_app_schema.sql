-- Core application schema baseline for Supabase migrations.
-- Non-destructive: creates missing public app tables/columns before RLS guardrail migrations run.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'supervisor', 'team_leader', 'collector', 'hidden_admin');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portfolio_type') THEN
    CREATE TYPE public.portfolio_type AS ENUM ('ACTIVE', 'WRITEOFF');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'domain_type') THEN
    CREATE TYPE public.domain_type AS ENUM ('FIRST', 'THIRD', 'WRITEOFF');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  name text,
  role public.user_role NOT NULL DEFAULT 'collector',
  is_super_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  source text,
  raw_data_url text,
  status text DEFAULT 'pending',
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
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

CREATE TABLE IF NOT EXISTS public.client_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_addresses (
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

CREATE TABLE IF NOT EXISTS public.client_loans (
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

CREATE TABLE IF NOT EXISTS public.client_actions (
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

CREATE TABLE IF NOT EXISTS public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  note text,
  done boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  action text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text,
  duration_sec integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.osint_results (
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

CREATE TABLE IF NOT EXISTS public.osint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL,
  query text,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer NOT NULL,
  level text NOT NULL,
  signals jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_number text,
  case_type text,
  status text DEFAULT 'pending',
  last_update text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  intelligence_id uuid,
  storage_path text NOT NULL,
  title text,
  mime_type text,
  size_bytes integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer NOT NULL,
  reason text,
  category text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attachments (
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

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS referral text,
  ADD COLUMN IF NOT EXISTS referral_text text,
  ADD COLUMN IF NOT EXISTS referral_image_url text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS team_leader_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS portfolio_type public.portfolio_type DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS domain_type public.domain_type DEFAULT 'FIRST',
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS cycle_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_phones
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_addresses
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS lat numeric(10,6),
  ADD COLUMN IF NOT EXISTS lng numeric(10,6),
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_loans
  ADD COLUMN IF NOT EXISTS loan_type text,
  ADD COLUMN IF NOT EXISTS loan_number text,
  ADD COLUMN IF NOT EXISTS cycle integer,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS will_legal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_date timestamptz,
  ADD COLUMN IF NOT EXISTS collector_percentage numeric(6,2),
  ADD COLUMN IF NOT EXISTS emi numeric(12,2),
  ADD COLUMN IF NOT EXISTS balance numeric(12,2),
  ADD COLUMN IF NOT EXISTS overdue numeric(12,2),
  ADD COLUMN IF NOT EXISTS amount_due numeric(12,2),
  ADD COLUMN IF NOT EXISTS bucket integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS penalty_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS penalty_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx ON public.users (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS clients_owner_idx ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS clients_team_idx ON public.clients(team_leader_id);
CREATE INDEX IF NOT EXISTS clients_created_by_idx ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON public.clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS phones_client_idx ON public.client_phones(client_id);
CREATE INDEX IF NOT EXISTS addresses_client_idx ON public.client_addresses(client_id);
CREATE INDEX IF NOT EXISTS loans_client_idx ON public.client_loans(client_id);
CREATE INDEX IF NOT EXISTS actions_client_idx ON public.client_actions(client_id);
CREATE INDEX IF NOT EXISTS followups_client_idx ON public.followups(client_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_client_id_idx ON public.audit_logs(client_id);
CREATE INDEX IF NOT EXISTS call_logs_client_idx ON public.call_logs(client_id);
CREATE INDEX IF NOT EXISTS osint_client_idx ON public.osint_results(client_id);
CREATE INDEX IF NOT EXISTS osint_history_client_idx ON public.osint_history(client_id);
CREATE INDEX IF NOT EXISTS fraud_client_idx ON public.fraud_analysis(client_id);
CREATE INDEX IF NOT EXISTS legal_client_idx ON public.legal_cases(client_id);
CREATE INDEX IF NOT EXISTS documents_client_idx ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_client_id ON public.client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_owner_id ON public.assignments(owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_client_id ON public.risk_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_attachments_client_id ON public.attachments(client_id);

COMMIT;
