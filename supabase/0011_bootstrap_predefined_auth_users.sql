-- 0011_bootstrap_predefined_auth_users.sql
-- Purpose:
-- Create missing predefined office users in auth.users with initial passwords,
-- then sync roles/names into public.users.
--
-- SECURITY:
-- 1) Run once from Supabase SQL editor (service-role context).
-- 2) Change initial passwords immediately after first login.

BEGIN;

WITH predefined AS (
  SELECT *
  FROM (
    VALUES
      ('mohamed.alaa@local.debtsmart', 'Mohamed Alaa', 'hidden_admin', true,  'Mohamed@12345'),
      ('adel@local.debtsmart',         'Adel',         'admin',        false, 'Adel@12345'),
      ('loay@local.debtsmart',         'Loay',         'supervisor',   false, 'Loay@12345'),
      ('mostafa@local.debtsmart',      'Mostafa',      'team_leader',  false, 'Mostafa@12345'),
      ('heba@local.debtsmart',         'Heba',         'team_leader',  false, 'Heba@12345'),
      ('noura@local.debtsmart',        'Noura',        'collector',    false, 'Noura@12345')
  ) AS t(email, full_name, app_role, is_super_user, initial_password)
),
inserted_auth AS (
  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p.email,
    crypt(p.initial_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('role', p.app_role, 'is_super_user', p.is_super_user),
    jsonb_build_object('name', p.full_name),
    NOW(),
    NOW()
  FROM predefined p
  WHERE NOT EXISTS (
    SELECT 1
    FROM auth.users au
    WHERE lower(au.email) = p.email
  )
  RETURNING id, email
),
updated_auth AS (
  UPDATE auth.users au
  SET
    raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('name', p.full_name),
    raw_app_meta_data = COALESCE(au.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object('role', p.app_role, 'is_super_user', p.is_super_user),
    email_confirmed_at = COALESCE(au.email_confirmed_at, NOW()),
    updated_at = NOW()
  FROM predefined p
  WHERE lower(au.email) = p.email
  RETURNING au.id, lower(au.email) AS email, p.full_name, p.app_role, p.is_super_user, au.created_at
)
INSERT INTO public.users (id, email, name, role, is_super_user, created_at)
SELECT
  ua.id,
  ua.email,
  ua.full_name,
  ua.app_role::public.user_role,
  ua.is_super_user,
  COALESCE(ua.created_at, NOW())
FROM updated_auth ua
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_super_user = EXCLUDED.is_super_user;

COMMIT;

-- Output helper: show all predefined accounts now present in auth.users.
WITH predefined AS (
  SELECT *
  FROM (
    VALUES
      ('mohamed.alaa@local.debtsmart'),
      ('adel@local.debtsmart'),
      ('loay@local.debtsmart'),
      ('mostafa@local.debtsmart'),
      ('heba@local.debtsmart'),
      ('noura@local.debtsmart')
  ) AS t(email)
)
SELECT au.id, lower(au.email) AS email
FROM auth.users au
JOIN predefined p ON lower(au.email) = p.email
ORDER BY email;
