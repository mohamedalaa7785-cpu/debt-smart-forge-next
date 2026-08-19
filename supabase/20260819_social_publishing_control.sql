-- Social publishing control plane: preview-first, approval-gated, dry-run by default.
create table if not exists public.social_channels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  platform text not null,
  display_name text not null,
  external_account_id text,
  secret_ref text,
  status text not null default 'draft',
  dry_run_only boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists social_channels_owner_idx on public.social_channels(owner_id);
create index if not exists social_channels_platform_idx on public.social_channels(platform);
create index if not exists social_channels_status_idx on public.social_channels(status);

create table if not exists public.publish_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id),
  channel_id uuid not null references public.social_channels(id) on delete cascade,
  draft_id uuid not null references public.content_drafts(id) on delete cascade,
  approval_id uuid references public.autonomy_approvals(id),
  status text not null default 'preview',
  scheduled_for timestamptz,
  published_at timestamptz,
  external_post_id text,
  attempts integer not null default 0,
  error text,
  preview_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists publish_jobs_owner_idx on public.publish_jobs(owner_id);
create index if not exists publish_jobs_channel_idx on public.publish_jobs(channel_id);
create index if not exists publish_jobs_status_idx on public.publish_jobs(status);
create index if not exists publish_jobs_schedule_idx on public.publish_jobs(scheduled_for);

alter table public.social_channels enable row level security;
alter table public.publish_jobs enable row level security;
