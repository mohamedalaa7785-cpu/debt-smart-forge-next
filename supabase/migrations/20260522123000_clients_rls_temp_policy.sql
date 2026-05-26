-- Safety patch: remove the temporary blanket clients policy.
-- Keep RLS enabled and rely on the scoped clients_* policies defined in
-- 20260502100000_schema_guardrails_and_rls.sql.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS clients_authenticated_full_access_temp ON public.clients;
