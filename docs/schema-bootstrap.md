# Schema Bootstrap (Supabase / Postgres)

This project expects application tables in `public` in addition to `auth.*` and `storage.*`.

If your Supabase project has only `auth` and `storage`, bootstrap schema from repo migrations:

1. Apply Drizzle migrations in order (`drizzle/migrations/*.sql`).
2. Ensure `drizzle/migrations/meta/_journal.json` includes all migration tags.
3. Run seed/import scripts only after schema creation (`insert_dataset.sql` is optional sample data).

## Canonical migration source

- `drizzle/migrations/0000_gorgeous_puppet_master.sql`
- `drizzle/migrations/0001_add_client_actions_fields.sql`
- `drizzle/migrations/0002_add_bank_import_columns.sql`
- `drizzle/migrations/0003_fix_users_columns_for_auth.sql`
- `drizzle/migrations/0004_add_client_referral.sql`
- `drizzle/migrations/0005_align_schema_and_security.sql`
- `drizzle/migrations/0006_auth_sync_hardening.sql`
- `drizzle/migrations/0007_round4_security_perf_indexes.sql`

## Notes

- `users` + `profiles` are both used by app logic. Keep role columns synchronized (`role`, `is_super_user`, `is_hidden_admin`).
- Upstash/Redis are not part of SQL bootstrap.
