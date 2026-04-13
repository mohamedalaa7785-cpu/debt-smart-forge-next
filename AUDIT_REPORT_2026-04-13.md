# Debt Smart Forge — Technical Audit & Upgrade Plan (2026-04-13)

## What was fixed in this pass
- Re-enabled strict auth checks by removing implicit auth bypass from middleware and server auth resolver.
- Fixed hidden admin seed email typo back to `gmail.com` in seed SQL files.
- Expanded `/api/search` coverage to include:
  - Client notes/referral/branch
  - Address fields (address/city/area)
  - Loan number
  - Action logs (note/result)
- Added a Supabase SQL hardening pack for:
  - Deduplication cleanup (`client_phones`)
  - Bucket/day normalization
  - Search indexes (btree + trigram + full text)
 codex/add-user-creation-with-password-lvsrkd
- Added CI workflow (`.github/workflows/ci.yml`) with install + typecheck + build gates.
- Added baseline RLS policy migration for core entities (`supabase/0004_core_rls_policies.sql`).
- Added shared query validation for search params (`lib/validators/search.ts`) and wired it into `/api/search`.
## Current architecture notes
- Core domain tables are present: users, clients, phones, addresses, loans, actions, call_logs, followups, osint, fraud.
- Search supports instant query UX; backend now scans more operational text.
- Map module has geocoding, risk/priority projection, and scoped map API.

## High-priority next steps
1. Build dedicated global search endpoint (ranked, weighted relevance, unified DTO).
2. Add saved searches + search history tables and APIs.
3. Add map heatmap + zone assignment model + route planning workflow.
4. Add regression tests for auth guards + search query correctness.

## Supabase SQL execution order
1. Run: `supabase/0002_search_and_data_hardening.sql`
2. Optional validation:
   - Verify indexes in `pg_indexes`
   - Compare search latency before/after
   - Check duplicate phone count is zero
