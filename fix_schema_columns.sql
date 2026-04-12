-- Fix missing columns in clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS team_leader_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS portfolio_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS domain_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_start_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_end_date DATE;

-- Re-apply indexes that failed
CREATE INDEX IF NOT EXISTS idx_clients_owner_id ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_team_leader_id ON public.clients(team_leader_id);

-- Re-apply policies that failed
DROP POLICY IF EXISTS "admin_active_only" ON public.clients;
CREATE POLICY "admin_active_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'admin' AND portfolio_type = 'ACTIVE');

DROP POLICY IF EXISTS "supervisor_writeoff_only" ON public.clients;
CREATE POLICY "supervisor_writeoff_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'supervisor' AND portfolio_type = 'WRITEOFF');

DROP POLICY IF EXISTS "team_leader_team_only" ON public.clients;
CREATE POLICY "team_leader_team_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'team_leader' AND team_leader_id = auth.uid());

DROP POLICY IF EXISTS "collector_own_only" ON public.clients;
CREATE POLICY "collector_own_only" ON public.clients
  FOR SELECT TO authenticated USING (public.get_my_role() = 'collector' AND owner_id = auth.uid());
