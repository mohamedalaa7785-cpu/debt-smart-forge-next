-- Align profiles.id with auth.users.id and harden profile sync trigger.

update public.profiles
set id = user_id
where id <> user_id
  and not exists (
    select 1 from public.profiles p2
    where p2.id = public.profiles.user_id
      and p2.user_id <> public.profiles.user_id
  );

alter table public.profiles
  alter column id drop default;

create or replace function public.enforce_profile_identity_match()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is null then
    raise exception 'profiles.user_id cannot be null';
  end if;
  new.id := new.user_id;
  return new;
end;
$$;

drop trigger if exists profiles_identity_match_trg on public.profiles;
create trigger profiles_identity_match_trg
before insert or update on public.profiles
for each row execute function public.enforce_profile_identity_match();

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

  insert into public.profiles (id, user_id, email, full_name, username, role, is_admin, is_hidden_admin)
  values (new.id, new.id, v_email, v_name, v_username, v_role, v_role in ('admin', 'hidden_admin'), v_hidden_admin)
  on conflict (user_id) do update
    set id = excluded.id,
        email = excluded.email,
        full_name = excluded.full_name,
        username = excluded.username,
        role = excluded.role,
        is_admin = excluded.is_admin,
        is_hidden_admin = excluded.is_hidden_admin,
        updated_at = now();

  return new;
end;
$$;
