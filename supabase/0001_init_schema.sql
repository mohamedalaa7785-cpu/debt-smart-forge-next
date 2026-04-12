-- 0001_init_schema.sql
-- Supabase baseline schema + indexes + RLS policies
-- Requires: pgcrypto extension for gen_random_uuid() and crypt()

create extension if not exists "pgcrypto";

-- USERS
create table if not exists public.users (
  id uuid not null primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  name text,
  role text not null default 'collector',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create index if not exists idx_users_email on public.users (lower(email));

-- SESSIONS
create table if not exists public.sessions (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null,
  ip text,
  user_agent text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_userid on public.sessions (user_id);

-- CLIENTS
create table if not exists public.clients (
  id uuid not null primary key default gen_random_uuid(),
  name text not null,
  national_id text,
  dob date,
  address jsonb default '{}'::jsonb,
  metadata jsonb default '{}'::jsonb,
  owner_id uuid null references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create index if not exists idx_clients_owner on public.clients (owner_id);

-- CLIENT PHONES
create table if not exists public.client_phones (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  phone_normalized text not null,
  phone_raw text,
  is_primary boolean default false,
  verified boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_phones_normalized on public.client_phones (phone_normalized);
create index if not exists idx_client_phones_clientid on public.client_phones (client_id);

-- LOANS
create table if not exists public.loans (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  principal numeric(14,2) not null default 0,
  outstanding numeric(14,2) not null default 0,
  currency text default 'EGP',
  status text default 'active',
  due_date date,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz null
);

create index if not exists idx_loans_clientid on public.loans (client_id);
create index if not exists idx_loans_status on public.loans (status);

-- CLIENT ACTIONS
create table if not exists public.client_actions (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid null references public.users (id) on delete set null,
  action_type text not null,
  note text,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_client_actions_client on public.client_actions (client_id);
create index if not exists idx_client_actions_user on public.client_actions (user_id);

-- OSINT RESULTS
create table if not exists public.osint_results (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  source text,
  confidence numeric(5,2) default 0,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_osint_client on public.osint_results (client_id);

-- IMAGES
create table if not exists public.client_images (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  url text not null,
  thumbnail_url text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_images_client on public.client_images (client_id);

-- CALL LOGS
create table if not exists public.call_logs (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  user_id uuid null references public.users (id) on delete set null,
  call_time timestamptz not null default now(),
  duration_seconds integer default 0,
  outcome text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_logs_client on public.call_logs (client_id);

-- FOLLOWUPS
create table if not exists public.followups (
  id uuid not null primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  due_date timestamptz,
  note text,
  user_id uuid null references public.users (id) on delete set null,
  sent boolean default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_followups_due on public.followups (due_date);

-- AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid not null primary key default gen_random_uuid(),
  actor_id uuid null references public.users (id) on delete set null,
  action text,
  object_type text,
  object_id uuid null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- PHONE INTEL CACHE
create table if not exists public.phone_intel (
  id uuid not null primary key default gen_random_uuid(),
  phone_normalized text not null,
  provider jsonb default '{}'::jsonb,
  confidence numeric(5,2) default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_phone_intel_phone on public.phone_intel (phone_normalized);

-- RLS
alter table public.clients enable row level security;
alter table public.client_actions enable row level security;
alter table public.loans enable row level security;
alter table public.client_phones enable row level security;
alter table public.client_images enable row level security;
alter table public.followups enable row level security;
alter table public.call_logs enable row level security;
alter table public.osint_results enable row level security;
alter table public.sessions enable row level security;
alter table public.users enable row level security;

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and u.role = 'admin'
  )
$$;

drop policy if exists "clients_select_owner_or_admin" on public.clients;
create policy "clients_select_owner_or_admin" on public.clients
  for select using (
    (owner_id = auth.uid())
    or public.is_admin(auth.uid())
  );

drop policy if exists "clients_insert_authenticated" on public.clients;
create policy "clients_insert_authenticated" on public.clients
  for insert with check (
    auth.uid() is not null
    and (owner_id is null or owner_id = auth.uid())
  );

drop policy if exists "clients_update_owner_or_admin" on public.clients;
create policy "clients_update_owner_or_admin" on public.clients
  for update using (
    (owner_id = auth.uid())
    or public.is_admin(auth.uid())
  ) with check (
    (owner_id = auth.uid())
    or public.is_admin(auth.uid())
  );

drop policy if exists "clients_delete_owner_or_admin" on public.clients;
create policy "clients_delete_owner_or_admin" on public.clients
  for delete using (
    (owner_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- Seed admin user (rotate immediately after first login)
insert into public.users (id, email, password, name, role, created_at)
values (
  gen_random_uuid(),
  'admin@example.com',
  crypt('ChangeMeNow!', gen_salt('bf')),
  'Admin',
  'admin',
  now()
)
on conflict (email) do nothing;
