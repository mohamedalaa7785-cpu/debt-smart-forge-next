# Schema Bootstrap (Supabase / Postgres)

This project expects application tables in `public` in addition to `auth.*` and `storage.*`.

If you are deleting/rebuilding Supabase tables from scratch, use the consolidated reset SQL first:

1. Open Supabase Dashboard -> SQL Editor.
2. Paste and run `supabase/0018_full_reset_current_schema.sql`.
3. Keep `auth.users` unless you intentionally delete Auth users separately; the reset script backfills existing Auth users into `public.users` and `public.profiles`.
4. Run seed/import scripts only after schema creation (`insert_dataset.sql` is optional sample data).

For incremental environments, apply Drizzle/Supabase migrations in order instead of the destructive reset script.

## Canonical migration source

- `drizzle/migrations/0000_gorgeous_puppet_master.sql`
- `drizzle/migrations/0001_add_client_actions_fields.sql`
- `drizzle/migrations/0002_add_bank_import_columns.sql`
- `drizzle/migrations/0003_fix_users_columns_for_auth.sql`
- `drizzle/migrations/0004_add_client_referral.sql`
- `drizzle/migrations/0005_align_schema_and_security.sql`
- `drizzle/migrations/0006_auth_sync_hardening.sql`
- `drizzle/migrations/0007_round4_security_perf_indexes.sql`
- `supabase/0018_full_reset_current_schema.sql` (destructive consolidated reset for clean Supabase rebuilds)

## Notes

- `users` + `profiles` are both used by app logic. Keep role columns synchronized (`role`, `is_super_user`, `is_hidden_admin`).
- Upstash/Redis are not part of SQL bootstrap.
