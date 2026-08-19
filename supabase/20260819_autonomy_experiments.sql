-- Growth experiments are proposals first; execution and external publishing remain approval-gated.
create table if not exists public.autonomy_experiments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  run_id uuid references public.autonomy_runs(id) on delete set null,
  name text not null,
  hypothesis text not null,
  channel text not null,
  status text not null default 'proposed',
  baseline_metric text not null,
  target_metric text not null,
  baseline_value numeric(14,4),
  target_value numeric(14,4),
  actual_value numeric(14,4),
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists autonomy_experiments_owner_idx on public.autonomy_experiments(owner_id);
create index if not exists autonomy_experiments_status_idx on public.autonomy_experiments(status);
create index if not exists autonomy_experiments_channel_idx on public.autonomy_experiments(channel);

alter table public.autonomy_experiments enable row level security;
