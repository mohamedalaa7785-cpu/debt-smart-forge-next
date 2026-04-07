-- FINAL PRODUCTION SCHEMA FOR DEBT SMART OS
-- Compatibility: Supabase Auth, Drizzle, Next.js App Router

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- TABLES
-- ========================================================

-- USERS (Synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'collector', -- hidden_admin, admin, supervisor, team_leader, collector
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENTS
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  customer_id TEXT UNIQUE,
  email TEXT,
  company TEXT,
  notes TEXT,
  image_url TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  portfolio_type TEXT, -- ACTIVE / WRITEOFF
  domain_type TEXT, -- FIRST / THIRD / WRITEOFF
  branch TEXT,
  cycle_start_date DATE,
  cycle_end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENT PHONES
CREATE TABLE IF NOT EXISTS public.client_phones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENT ADDRESSES
CREATE TABLE IF NOT EXISTS public.client_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  city TEXT,
  area TEXT,
  lat NUMERIC,
  lng NUMERIC,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENT LOANS
CREATE TABLE IF NOT EXISTS public.client_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  loan_type TEXT,
  emi NUMERIC,
  balance NUMERIC,
  overdue NUMERIC,
  bucket INTEGER,
  penalty_enabled BOOLEAN DEFAULT false,
  penalty_amount NUMERIC DEFAULT 0,
  amount_due NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENT ACTIONS
CREATE TABLE IF NOT EXISTS public.client_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- CALL, VISIT, WHATSAPP, FOLLOW
  note TEXT,
  result TEXT,
  amount_paid NUMERIC,
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CALL LOGS
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  call_status TEXT, -- answered, no_answer, promised, refused
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FOLLOW-UPS
CREATE TABLE IF NOT EXISTS public.followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  scheduled_for DATE NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT now()
);

-- OSINT RESULTS
CREATE TABLE IF NOT EXISTS public.osint_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  social JSONB,
  workplace JSONB,
  web_results JSONB,
  image_results JSONB,
  summary TEXT,
  confidence_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- CLIENT IMAGES
CREATE TABLE IF NOT EXISTS public.client_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- LEGAL CASES
CREATE TABLE IF NOT EXISTS public.legal_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  case_number TEXT,
  case_type TEXT,
  status TEXT,
  last_update TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================================
-- INDEXES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_leader_id ON public.clients(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_client_phones_client_id ON public.client_phones(client_id);
CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON public.client_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_client_loans_client_id ON public.client_loans(client_id);
CREATE INDEX IF NOT EXISTS idx_client_actions_client_id ON public.client_actions(client_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_client_id ON public.call_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_followups_client_id ON public.followups(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_client_id ON public.audit_logs(client_id);

-- ========================================================
-- AUTH TRIGGER
-- ========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'collector')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================================
-- RLS POLICIES
-- ========================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osint_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- CLIENTS POLICIES
-- hidden_admin: full access
CREATE POLICY "hidden_admin_all" ON public.clients
  FOR ALL TO authenticated USING (public.get_my_role() = 'hidden_admin');

-- admin: sees only ACTIVE portfolio
CREATE POLICY "admin_active_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'admin' AND portfolio_type = 'ACTIVE');

-- supervisor: sees only WRITEOFF portfolio
CREATE POLICY "supervisor_writeoff_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'supervisor' AND portfolio_type = 'WRITEOFF');

-- team_leader: sees only clients assigned to team_leader_id
CREATE POLICY "team_leader_team_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'team_leader' AND team_leader_id = auth.uid());

-- collector: sees only clients owned by owner_id
CREATE POLICY "collector_own_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'collector' AND owner_id = auth.uid());

-- Insertion: all authenticated users can create clients (owner_id will be set in app)
CREATE POLICY "auth_insert_clients" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (true);

-- Child tables policies (accessible if parent client is accessible)
-- Using a pattern: "Policy Name" ON "Table" FOR ALL USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id))
-- Note: Supabase RLS will automatically apply the clients table policies to the subquery

CREATE POLICY "access_phones" ON public.client_phones FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_addresses" ON public.client_addresses FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_loans" ON public.client_loans FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_actions" ON public.client_actions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_call_logs" ON public.call_logs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_followups" ON public.followups FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_osint" ON public.osint_results FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_images" ON public.client_images FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
CREATE POLICY "access_legal" ON public.legal_cases FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id));
