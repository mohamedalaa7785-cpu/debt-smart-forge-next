# Supabase folder checklist

This folder is now ready for Supabase CLI and GitHub integration.

## Working directory value
Use `.` as the working directory in Supabase GitHub integration for this repository.

## What exists
- `config.toml` for Supabase CLI detection and local defaults.
- SQL files `0001` → `0017` (historical schema updates).
- `migrations/` folder for timestamp-based Supabase migrations.

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
