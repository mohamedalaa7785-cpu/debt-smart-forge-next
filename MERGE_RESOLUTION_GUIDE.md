# PR Merge Conflict Resolution (GitHub)

If GitHub shows conflicts for these files:
- `.env.example`
- `SUPABASE_BANK_IMPORT_SQL.sql`
- `app/add-client/page.tsx`
- `app/api/auth/register/route.ts`
- `drizzle/migrations/meta/_journal.json`

use this exact flow locally.

## 1) Sync and merge main into your branch
```bash
git fetch origin
git checkout work
git merge origin/main
```

## 2) Resolve files
For all files below, keep **branch version (ours)** except `_journal.json` where you must keep all migration entries.

```bash
git checkout --ours .env.example
git checkout --ours SUPABASE_BANK_IMPORT_SQL.sql
git checkout --ours app/add-client/page.tsx
git checkout --ours app/api/auth/register/route.ts
```

For `drizzle/migrations/meta/_journal.json`:
- Open file manually.
- Keep a single valid JSON object.
- Ensure all entries exist once, sorted by idx: `0000`, `0001`, `0002`, `0003`, `0004`.

## 3) Finalize merge
```bash
git add .env.example SUPABASE_BANK_IMPORT_SQL.sql app/add-client/page.tsx app/api/auth/register/route.ts drizzle/migrations/meta/_journal.json
git commit -m "Resolve merge conflicts with main for env/sql/import/auth/migrations"
git push origin work
```

## 4) Verify before merging PR
```bash
rg -n "^<<<<<<< |^>>>>>>> |^=======$" -S . || true
npx tsc --noEmit --incremental false
npm run -s build
```
