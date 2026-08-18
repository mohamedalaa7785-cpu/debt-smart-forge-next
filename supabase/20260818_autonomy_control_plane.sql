-- Autonomy control plane: proposals are persisted and auditable; external publishing remains approval-gated.
create table if not exists public.autonomy_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  name text not null,
  description text,
  status text not null default 'active',
  cadence text not null default 'daily',
  risk_level text not null default 'low',
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists autonomy_goals_owner_idx on public.autonomy_goals(owner_id);
create index if not exists autonomy_goals_status_idx on public.autonomy_goals(status);

create table if not exists public.autonomy_runs (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.autonomy_goals(id) on delete cascade,
  owner_id uuid not null references public.users(id),
  status text not null default 'queued',
  trigger text not null default 'manual',
  summary text,
  findings jsonb not null default '[]'::jsonb,
  requires_approval boolean not null default true,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists autonomy_runs_owner_idx on public.autonomy_runs(owner_id);
create index if not exists autonomy_runs_goal_idx on public.autonomy_runs(goal_id);
create index if not exists autonomy_runs_created_idx on public.autonomy_runs(created_at);

create table if not exists public.autonomy_tasks (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.autonomy_runs(id) on delete cascade,
  type text not null,
  title text not null,
  status text not null default 'proposed',
  priority integer not null default 50,
  payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists autonomy_tasks_run_idx on public.autonomy_tasks(run_id);
create index if not exists autonomy_tasks_status_idx on public.autonomy_tasks(status);

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  task_id uuid references public.autonomy_tasks(id) on delete set null,
  platform text not null,
  title text not null,
  body text not null,
  status text not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists content_drafts_owner_idx on public.content_drafts(owner_id);
create index if not exists content_drafts_status_idx on public.content_drafts(status);
create index if not exists content_drafts_schedule_idx on public.content_drafts(scheduled_for);

create table if not exists public.autonomy_approvals (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.autonomy_runs(id) on delete cascade,
  task_id uuid references public.autonomy_tasks(id) on delete cascade,
  reviewer_id uuid references public.users(id),
  status text not null default 'pending',
  reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists autonomy_approvals_run_idx on public.autonomy_approvals(run_id);
create index if not exists autonomy_approvals_status_idx on public.autonomy_approvals(status);

create table if not exists public.autonomy_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  metric text not null,
  value numeric(14,4) not null,
  source text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists autonomy_metrics_owner_idx on public.autonomy_metrics(owner_id);
create index if not exists autonomy_metrics_metric_idx on public.autonomy_metrics(metric);

alter table public.autonomy_goals enable row level security;
alter table public.autonomy_runs enable row level security;
alter table public.autonomy_tasks enable row level security;
alter table public.content_drafts enable row level security;
alter table public.autonomy_approvals enable row level security;
alter table public.autonomy_metrics enable row level security;
