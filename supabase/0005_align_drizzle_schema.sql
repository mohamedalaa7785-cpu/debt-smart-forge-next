-- Align Supabase schema with current Drizzle runtime schema.
BEGIN;

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

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_user boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.users
  ALTER COLUMN role TYPE public.user_role USING COALESCE(role, 'collector')::public.user_role,
  ALTER COLUMN role SET DEFAULT 'collector';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS customer_id text,
  ADD COLUMN IF NOT EXISTS referral text,
  ADD COLUMN IF NOT EXISTS team_leader_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS cycle_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS cycle_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.clients
  ALTER COLUMN portfolio_type TYPE public.portfolio_type USING COALESCE(portfolio_type, 'ACTIVE')::public.portfolio_type,
  ALTER COLUMN domain_type TYPE public.domain_type USING COALESCE(domain_type, 'FIRST')::public.domain_type;

ALTER TABLE public.clients
  ALTER COLUMN portfolio_type SET DEFAULT 'ACTIVE',
  ALTER COLUMN domain_type SET DEFAULT 'FIRST';

CREATE UNIQUE INDEX IF NOT EXISTS clients_customer_id_uidx ON public.clients(customer_id);
CREATE INDEX IF NOT EXISTS clients_owner_idx ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS clients_team_idx ON public.clients(team_leader_id);

ALTER TABLE public.client_phones
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_addresses
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS area text,
  ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_loans
  ADD COLUMN IF NOT EXISTS loan_number text,
  ADD COLUMN IF NOT EXISTS cycle integer,
  ADD COLUMN IF NOT EXISTS organization text,
  ADD COLUMN IF NOT EXISTS will_legal boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_date timestamptz,
  ADD COLUMN IF NOT EXISTS collector_percentage numeric(6,2),
  ADD COLUMN IF NOT EXISTS overdue numeric(12,2),
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.client_actions
  ADD COLUMN IF NOT EXISTS result text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(12,2),
  ADD COLUMN IF NOT EXISTS next_action_date timestamptz;

CREATE TABLE IF NOT EXISTS public.osint_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  result jsonb DEFAULT '{}'::jsonb,
  confidence integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  score integer DEFAULT 0,
  level text DEFAULT 'low',
  signals jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS osint_history_client_idx ON public.osint_history(client_id);
CREATE INDEX IF NOT EXISTS fraud_client_idx ON public.fraud_analysis(client_id);
CREATE INDEX IF NOT EXISTS fraud_score_idx ON public.fraud_analysis(score);

COMMIT;
