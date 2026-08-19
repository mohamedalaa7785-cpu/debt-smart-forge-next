-- Prevent concurrent autonomy runs for the same owner.
-- Failed and completed runs remain fully auditable and do not block future work.
create unique index if not exists autonomy_runs_one_active_per_owner_idx
  on public.autonomy_runs(owner_id)
  where status in ('queued', 'running');

create index if not exists autonomy_runs_status_owner_idx
  on public.autonomy_runs(owner_id, status, created_at desc);
