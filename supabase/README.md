# Supabase folder checklist

This folder is now ready for Supabase CLI and GitHub integration.

## Working directory value
Use `.` as the working directory in Supabase GitHub integration for this repository.

## What exists
- `config.toml` for Supabase CLI detection and local defaults.
- SQL files `0001` → `0018` (historical schema updates plus `0018_full_reset_current_schema.sql` for a clean rebuild).
- `migrations/` folder for timestamp-based Supabase migrations.

## Clean rebuild workflow (when you are intentionally deleting app tables)
1. Open Supabase Dashboard -> SQL Editor.
2. Paste and run `0018_full_reset_current_schema.sql`.
3. Do not drop Supabase-managed `auth`/`storage` schemas; the script only rebuilds public app tables and backfills existing Auth users.
4. Re-login in the app so profile/user sync is refreshed.
5. Run `npm run check:supabase` before deployment; it verifies the project id plus required reset SQL tables, columns, auth sync, RLS, and storage setup.

codex/fix-this-problem
## If you see `relation "public.clients" does not exist`
That means an RLS/guardrail migration ran before the core app tables existed. The timestamp migration `migrations/20260502095000_core_app_schema.sql` creates the required app tables before later RLS migrations. Pull the latest migrations and run them in timestamp order, or run `0018_full_reset_current_schema.sql` for a clean rebuild.

 main
## Recommended safe workflow
1. Link the remote project once:
   - `supabase link --project-ref <PROJECT_REF>`
2. Validate migrations locally:
   - `supabase db lint`
   - `supabase db reset`
3. Create any new migration only with:
   - `supabase migration new <name>`
4. Put new migrations in `supabase/migrations/` (14-digit timestamp format (YYYYMMDDHHMMSS)).

## Notes
- Keep old numbered SQL files for historical reference unless you intentionally consolidate.
- For production deploys, always test reset/lint in CI before applying migrations to remote DB.


## project_id
- Keep `project_id` set after linking your Supabase project.
- If it is empty, `npm run check:supabase` will emit a warning until linked.
