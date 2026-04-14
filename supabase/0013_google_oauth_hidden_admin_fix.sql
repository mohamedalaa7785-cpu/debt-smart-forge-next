-- Ensure Google OAuth users are synced safely and designated hidden admin email is enforced.

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

  v_hidden_admin := coalesce((new.raw_app_meta_data->>'is_super_user')::boolean, false)
                    or v_email = 'mohamed.alaa7785@gmail.com';

  v_role := coalesce((new.raw_app_meta_data->>'role')::public.user_role, 'collector');
  if v_hidden_admin then
    v_role := 'hidden_admin';
  end if;

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

-- Backfill role enforcement for existing hidden admin email.
update public.profiles
set role = 'hidden_admin',
    is_admin = true,
    is_hidden_admin = true,
    updated_at = now()
where lower(email) = 'mohamed.alaa7785@gmail.com';
