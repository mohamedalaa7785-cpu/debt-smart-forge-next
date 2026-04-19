-- Remove legacy hardcoded hidden-admin email assignment.

update public.profiles
set is_hidden_admin = false,
    is_admin = case when role in ('admin','hidden_admin') then true else false end,
    role = case when role = 'hidden_admin' then 'collector'::public.user_role else role end,
    updated_at = now()
where lower(email) = 'mohamed.alaa7785@gmail.com';
