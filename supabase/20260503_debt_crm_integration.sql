-- Debt Smart Forge - Comprehensive CRM Integration Migration (V2 - Fixed for existing schema)
-- Date: 2026-05-03

BEGIN;

-- =====================================================
-- 1) Extensions & Enums
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Ensure enums exist
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

-- =====================================================
-- 2) Fix/Update Existing Tables
-- =====================================================

-- Ensure clients table has all required fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS customer_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_text text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_image_url text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portfolio_type_new public.portfolio_type DEFAULT 'ACTIVE';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS domain_type_new public.domain_type DEFAULT 'FIRST';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_start_date timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_end_date timestamptz;

-- Update status to be more flexible if it was constrained
ALTER TABLE public.clients ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.clients ALTER COLUMN status TYPE text;
ALTER TABLE public.clients ALTER COLUMN status SET DEFAULT 'NEW';

-- =====================================================
-- 3) New CRM Tables
-- =====================================================

-- Import Batches for tracking bulk uploads
CREATE TABLE IF NOT EXISTS public.import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text,
    source text,
    raw_data_url text,
    status text DEFAULT 'pending',
    created_by uuid REFERENCES public.users(id),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id);

-- Assignments table for historical tracking
CREATE TABLE IF NOT EXISTS public.assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    assigned_by uuid REFERENCES public.users(id),
    status text DEFAULT 'active',
    notes text,
    created_at timestamptz DEFAULT now()
);

-- Client Notes table
CREATE TABLE IF NOT EXISTS public.client_notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id),
    content text NOT NULL,
    is_important boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Risk Scores table
CREATE TABLE IF NOT EXISTS public.risk_scores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    score integer NOT NULL,
    reason text,
    category text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.users(id),
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    category text,
    created_at timestamptz DEFAULT now()
);

-- Permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.user_role NOT NULL,
    resource text NOT NULL,
    action text NOT NULL,
    UNIQUE(role, resource, action)
);

-- =====================================================
-- 4) Performance Indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients (owner_id);

CREATE INDEX IF NOT EXISTS idx_phones_client_id ON public.client_phones (client_id);
CREATE INDEX IF NOT EXISTS idx_addresses_client_id ON public.client_addresses (client_id);
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON public.client_loans (client_id);
CREATE INDEX IF NOT EXISTS idx_notes_client_id ON public.client_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_assignments_owner_id ON public.assignments (owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_client_id ON public.risk_scores (client_id);
CREATE INDEX IF NOT EXISTS idx_attachments_client_id ON public.attachments (client_id);

-- =====================================================
-- 5) Row Level Security (RLS)
-- =====================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_my_role() 
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Clean up existing policies safely
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('clients', 'client_phones', 'client_addresses', 'client_loans', 'client_notes', 'assignments', 'risk_scores', 'attachments', 'import_batches')) 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- CLIENTS POLICIES
CREATE POLICY "Admin full access" ON public.clients FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY "Collector read assigned" ON public.clients FOR SELECT TO authenticated 
USING (owner_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Collector update assigned" ON public.clients FOR UPDATE TO authenticated 
USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Collector insert own" ON public.clients FOR INSERT TO authenticated 
WITH CHECK (true);

-- CHILD TABLES POLICIES
CREATE POLICY "Access child by client visibility" ON public.client_phones FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

CREATE POLICY "Access child by client visibility" ON public.client_addresses FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

CREATE POLICY "Access child by client visibility" ON public.client_loans FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

CREATE POLICY "Access child by client visibility" ON public.client_notes FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

CREATE POLICY "Access child by client visibility" ON public.attachments FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

CREATE POLICY "Access child by client visibility" ON public.risk_scores FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));

-- ASSIGNMENTS & IMPORT BATCHES
CREATE POLICY "Admin access only" ON public.import_batches FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

CREATE POLICY "View own assignments" ON public.assignments FOR SELECT TO authenticated 
USING (owner_id = auth.uid() OR assigned_by = auth.uid() OR public.get_my_role() IN ('admin', 'hidden_admin', 'supervisor'));

-- =====================================================
-- 6) Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_client_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
        INSERT INTO public.assignments (client_id, owner_id, assigned_by)
        VALUES (NEW.id, NEW.owner_id, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_assignment ON public.clients;
CREATE TRIGGER trg_log_assignment
AFTER UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.log_client_assignment();

COMMIT;
