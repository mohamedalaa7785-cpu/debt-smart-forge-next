-- Creates profile system linked to auth.users with strict RLS.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  username text unique,
  full_name text,
  role public.user_role not null default 'collector',
  is_admin boolean not null default false,
  is_hidden_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_not_email check (username is null or position('@' in username) = 0)
);

create unique index if not exists profiles_username_uidx on public.profiles (lower(username)) where username is not null;

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and role = (select p.role from public.profiles p where p.user_id = auth.uid())
  and is_admin = (select p.is_admin from public.profiles p where p.user_id = auth.uid())
  and is_hidden_admin = (select p.is_hidden_admin from public.profiles p where p.user_id = auth.uid())
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
  v_username text;
  v_role public.user_role;
  v_hidden_admin boolean;
begin
  v_email := lower(coalesce(new.email, ''));
  v_name := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
  v_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  v_role := coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'collector');
  v_hidden_admin := coalesce((new.raw_app_meta_data->>'is_super_user')::boolean, false);

  insert into public.profiles (user_id, email, full_name, username, role, is_admin, is_hidden_admin)
  values (new.id, v_email, v_name, v_username, v_role, v_role in ('admin', 'hidden_admin'), v_hidden_admin)
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        username = excluded.username,
        role = excluded.role,
        is_admin = excluded.is_admin,
        is_hidden_admin = excluded.is_hidden_admin,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert or update on auth.users
for each row execute function public.handle_new_user_profile();

insert into public.profiles (user_id, email, full_name, role, is_admin, is_hidden_admin)
select u.id,
       lower(u.email),
       nullif(trim(coalesce(u.raw_user_meta_data->>'name', '')), ''),
       coalesce((u.raw_app_meta_data->>'role')::public.user_role, 'collector'),
       coalesce((u.raw_app_meta_data->>'role')::public.user_role, 'collector') in ('admin', 'hidden_admin'),
       coalesce((u.raw_app_meta_data->>'is_super_user')::boolean, false)
from auth.users u
on conflict (user_id) do nothing;
