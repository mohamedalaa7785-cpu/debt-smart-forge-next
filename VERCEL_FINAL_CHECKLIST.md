# Vercel Final Checklist (Execution-Ready)

## 1) Required Environment Variables
Set these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `SERPAPI_API_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `NEXT_PUBLIC_APP_URL`

Optional (recommended):
- `COLLECTION_AGENT_NAME`
- `COLLECTION_ORG_NAME`
- `TRUECALLER_LOOKUP_URL`
- `TRUECALLER_API_KEY`
- `REDIS_URL`

## 2) Run Supabase SQL (in order)
Use SQL Editor and run:
1. `SUPABASE_BANK_IMPORT_SQL.sql` (includes users auth hotfix + referral + loan columns)
2. Optional indexes/backfill sections in same file (already included)

## 3) Drizzle Migrations (if you run migrations in CI)
Ensure these are applied in order:
- `0002_add_bank_import_columns.sql`
- `0003_fix_users_columns_for_auth.sql`
- `0004_add_client_referral.sql`

## 4) Post-Deploy Smoke Tests
After deployment:
1. Open `/login` and login with a valid account.
2. Open `/signup` and create a test account.
3. Add a client from `/add-client` with:
   - referral text
   - at least one phone
   - one loan
4. Open `/client/[id]` and verify:
   - Referral block shown
   - Loan fields shown
   - Address link opens Google Maps
5. Trigger recommendation + WhatsApp action.
6. Import flow test:
   - upload bank image
   - dry run
   - import + distribution

## 5) Known safety/compliance note for Truecaller
The integration is **optional** and expects a legally approved provider endpoint via:
- `TRUECALLER_LOOKUP_URL`
- `TRUECALLER_API_KEY`

Do not use unauthorized scraping; use official/compliant access only.
