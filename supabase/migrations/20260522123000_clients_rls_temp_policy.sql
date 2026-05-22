-- Temporary broad RLS policy to unblock authenticated imports into public.clients.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'clients_authenticated_full_access_temp'
  ) THEN
    CREATE POLICY clients_authenticated_full_access_temp
      ON public.clients
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;
