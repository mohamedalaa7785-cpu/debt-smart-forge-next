-- 0010_seed_predefined_office_users.sql
-- Purpose:
-- 1) Set fixed roles/names for the office accounts in auth.users metadata.
-- 2) Upsert matching profiles into public.users with the same auth UUIDs.
--
-- IMPORTANT:
-- - This script does NOT create missing auth.users records.
-- - Missing accounts can be created by the app's first-login auto-provision flow,
--   then re-run this script to enforce final role/name mapping.

BEGIN;

WITH predefined AS (
  SELECT *
  FROM (
    VALUES
      ('mohamed.alaa@local.debtsmart', 'Mohamed Alaa', 'hidden_admin', true),
      ('adel@local.debtsmart',         'Adel',         'admin',        false),
      ('loay@local.debtsmart',         'Loay',         'supervisor',   false),
      ('mostafa@local.debtsmart',      'Mostafa',      'team_leader',  false),
      ('heba@local.debtsmart',         'Heba',         'team_leader',  false),
      ('noura@local.debtsmart',        'Noura',        'collector',    false)
  ) AS t(email, full_name, app_role, is_super_user)
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

-- Optional check: which predefined accounts are still missing in auth.users?
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
SELECT p.email AS missing_auth_user
FROM predefined p
LEFT JOIN auth.users au ON lower(au.email) = p.email
WHERE au.id IS NULL;
