-- SaaS domain expansion tables + RLS baselines.
create extension if not exists pgcrypto;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and (p.role in ('admin','hidden_admin') or p.is_admin = true or p.is_hidden_admin = true)
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  principal_amount numeric(12,2) not null default 0,
  outstanding_amount numeric(12,2) not null default 0,
  currency text not null default 'EGP',
  status text not null default 'open',
  due_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  stage text not null default 'new',
  priority smallint not null default 3,
  next_action_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  role public.user_role not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intelligence (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  score numeric(5,2),
  summary text,
  signals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  storage_path text not null,
  mime_type text,
  title text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  lat double precision,
  lng double precision,
  address text,
  city text,
  area text,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  is_secret boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, key)
);

create index if not exists debts_owner_idx on public.debts(owner_user_id);
create index if not exists debts_client_idx on public.debts(client_id);
create index if not exists payments_owner_idx on public.payments(owner_user_id);
create index if not exists payments_debt_idx on public.payments(debt_id);
create index if not exists collections_owner_idx on public.collections(owner_user_id);
create index if not exists collections_debt_idx on public.collections(debt_id);
create index if not exists intelligence_owner_idx on public.intelligence(owner_user_id);
create index if not exists intelligence_client_idx on public.intelligence(client_id);
create index if not exists documents_owner_idx on public.documents(owner_user_id);
create index if not exists documents_client_idx on public.documents(client_id);
create index if not exists locations_owner_idx on public.locations(owner_user_id);
create index if not exists locations_client_idx on public.locations(client_id);
create index if not exists settings_owner_idx on public.settings(owner_user_id);

alter table public.debts enable row level security;
alter table public.payments enable row level security;
alter table public.collections enable row level security;
alter table public.admin_users enable row level security;
alter table public.intelligence enable row level security;
alter table public.documents enable row level security;
alter table public.locations enable row level security;
alter table public.settings enable row level security;

drop trigger if exists debts_set_updated_at on public.debts;
create trigger debts_set_updated_at before update on public.debts for each row execute function public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
drop trigger if exists collections_set_updated_at on public.collections;
create trigger collections_set_updated_at before update on public.collections for each row execute function public.set_updated_at();
drop trigger if exists admin_users_set_updated_at on public.admin_users;
create trigger admin_users_set_updated_at before update on public.admin_users for each row execute function public.set_updated_at();
drop trigger if exists intelligence_set_updated_at on public.intelligence;
create trigger intelligence_set_updated_at before update on public.intelligence for each row execute function public.set_updated_at();
drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();
drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at before update on public.locations for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings for each row execute function public.set_updated_at();

create policy "debts_owner_or_admin_select" on public.debts
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "debts_owner_or_admin_modify" on public.debts
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "payments_owner_or_admin_select" on public.payments
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "payments_owner_or_admin_modify" on public.payments
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "collections_owner_or_admin_select" on public.collections
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "collections_owner_or_admin_modify" on public.collections
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "intelligence_owner_or_admin_select" on public.intelligence
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "intelligence_owner_or_admin_modify" on public.intelligence
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "documents_owner_or_admin_select" on public.documents
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "documents_owner_or_admin_modify" on public.documents
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "locations_owner_or_admin_select" on public.locations
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "locations_owner_or_admin_modify" on public.locations
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "settings_owner_or_admin_select" on public.settings
for select using (owner_user_id = auth.uid() or public.is_admin_user());
create policy "settings_owner_or_admin_modify" on public.settings
for all using (owner_user_id = auth.uid() or public.is_admin_user())
with check (owner_user_id = auth.uid() or public.is_admin_user());

create policy "admin_users_admin_only" on public.admin_users
for all using (public.is_admin_user())
with check (public.is_admin_user());
