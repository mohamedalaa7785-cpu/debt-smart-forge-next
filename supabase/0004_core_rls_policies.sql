-- Core RLS baseline for Debt Smart core entities.
-- Apply after confirming your project uses Supabase Auth user IDs in public.users.id.

BEGIN;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;

-- Clients: authenticated users can access only scoped records unless hidden_admin.
DROP POLICY IF EXISTS clients_select_scoped ON public.clients;
CREATE POLICY clients_select_scoped
ON public.clients
FOR SELECT
TO authenticated
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
CREATE POLICY clients_insert_scoped
ON public.clients
FOR INSERT
TO authenticated
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
CREATE POLICY clients_update_scoped
ON public.clients
FOR UPDATE
TO authenticated
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
CREATE POLICY clients_delete_admin_only
ON public.clients
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role IN ('hidden_admin', 'admin')
  )
);

-- Child tables inherit client visibility.
DROP POLICY IF EXISTS child_select_by_client ON public.client_phones;
CREATE POLICY child_select_by_client
ON public.client_phones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = client_phones.client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND c.team_leader_id = u.id)
        OR c.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS child_select_by_client_addresses ON public.client_addresses;
CREATE POLICY child_select_by_client_addresses
ON public.client_addresses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = client_addresses.client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND c.team_leader_id = u.id)
        OR c.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS child_select_by_client_loans ON public.client_loans;
CREATE POLICY child_select_by_client_loans
ON public.client_loans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = client_loans.client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND c.team_leader_id = u.id)
        OR c.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS child_select_by_client_actions ON public.client_actions;
CREATE POLICY child_select_by_client_actions
ON public.client_actions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = client_actions.client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND c.team_leader_id = u.id)
        OR c.owner_id = u.id
      )
  )
);

DROP POLICY IF EXISTS child_select_by_client_followups ON public.followups;
CREATE POLICY child_select_by_client_followups
ON public.followups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clients c
    JOIN public.users u ON u.id = auth.uid()
    WHERE c.id = followups.client_id
      AND (
        u.role = 'hidden_admin'
        OR (u.role = 'admin' AND c.portfolio_type = 'ACTIVE')
        OR (u.role = 'supervisor' AND c.portfolio_type = 'WRITEOFF')
        OR (u.role = 'team_leader' AND c.team_leader_id = u.id)
        OR c.owner_id = u.id
      )
  )
);

COMMIT;
