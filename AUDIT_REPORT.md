# Debt Smart OS — Full Technical Audit (2026-04-07)

## 1. 🔴 CRITICAL ISSUES
1. **Auth bypass across most APIs**: Many sensitive routes (`/api/call-mode`, `/api/client/[id]`, `/api/dashboard`, `/api/map`, `/api/search`, `/api/whatsapp`) do not require authenticated user context; only a subset calls `requireUser`. This enables unauthenticated data extraction and action logging.
2. **Role model mismatch**: DB/types define `admin|supervisor|team_leader|collector|hidden_admin`, but auth middleware only allows `admin|agent`, creating broken or bypassable authorization paths.
3. **Ownership not enforced server-side**: `getClientById` returns full client bundle without checking requester ownership/role scope.
4. **No transaction in API client create flow**: `/api/clients` inserts across 4+ tables without wrapping transaction; partial writes can corrupt records.
5. **PII leakage in logs**: login action logs raw email and many handlers print raw errors directly.
6. **Decision engine duplication/conflict**: two decision engines (`server/core/decision.engine.ts` and `server/services/decision.engine.ts`) with conflicting formulas.
7. **Migration/schema drift**: drizzle migration lacks several current schema columns/tables (`sessions`, `legal_cases`, `logs`, many newer fields), making fresh deployments inconsistent.

## 2. 🟠 MAJOR ISSUES
- Dashboard/home pages perform N+1 API requests (`/api/clients` then per-client `/api/client/:id`).
- Phone intelligence uses wildcard `LIKE` search and no normalized index.
- Map/call list priority logic is placeholder/hardcoded (`risk: HIGH`, `priority: 80`, phone `N/A`).
- OSINT and AI flows have weak structured validation; free-form model output may break downstream assumptions.
- No central input schema validation (Zod/DTO), heavy `any` usage throughout API/services.
- `app/page.tsx` expects `summary` shape that `/api/client/[id]` does not provide, causing runtime instability.
- API rate limiting uses in-memory maps (non-shared, resets on restart/serverless cold start).

## 3. 🟡 MINOR ISSUES
- Duplicate utility layers (`lib/api.ts` and `lib/api-secure.ts`) with inconsistent headers.
- Mixed workflow directories (`.github/workflows` and `github/workflows`).
- Components present but unused (`ActionButtons`, `ClientCard`, `MapView`, `MultiInput`, `OSINTPanel`).
- CSS and component files contain odd trailing brace formatting, reducing maintainability.

## 4. 🟢 WORKING CORRECTLY
- `next build` passes and all app routes compile.
- Password hashing uses bcryptjs and sessions are tokenized (random 48-byte hex).
- Upload endpoint enforces MIME and approximate size limits before Cloudinary upload.
- Risk engine and financial engine are deterministic and testable pure functions.

## 5. ❌ MISSING FEATURES (requested vs actual)
- Google OAuth: **missing**.
- JWT validation: **missing** (session token DB lookup used instead).
- Robust RBAC enforcement in middleware/APIs: **partial/missing**.
- Hidden admin bypass logic end-to-end in middleware/UI: **missing**.
- Follow-up scheduler/background reminder engine: **missing** (table exists only).
- Call tracking detail fields (outcome notes/promise date/callback): **missing**.
- Notifications system: **missing**.
- Admin/supervisor/team_leader dedicated dashboards: **missing**.
- Dataset import pipeline API: **missing** (only SQL scripts).
- Output sanitization and XSS hardening: **partial**.

## 6. ⚠️ SECURITY RISKS
- Unauthenticated data endpoints expose client PII and debt values.
- Authorization checks absent for client detail ownership.
- No CSRF mitigations for cookie-based auth (if introduced later).
- No persistent distributed rate limiting (Redis/Upstash); easy abuse.
- Prompt injection risk: raw client/OSINT strings sent directly to model.
- API keys/secret reliance without startup guard; runtime failures can expose stack traces.
- File upload trusts base64 prefix only; no deep content inspection/AV scan.

## 7. 🚀 PERFORMANCE ISSUES
- N+1 fetch at UI and service levels.
- Multiple per-client DB queries inside loops in `/api/call-mode`.
- Unbounded table scans in dashboard metrics endpoints.
- Missing DB indexes for phone lookup and frequent filters.
- In-memory caches not effective in horizontal/serverless deployments.

## 8. 🧠 ARCHITECTURE PROBLEMS
- API layer contains business logic (risk/priority/AI orchestration directly in route handlers).
- `server/core` and `server/services` overlap responsibilities.
- No repository/query abstraction; routes call db directly.
- No centralized validation or error envelope strategy.

## 9. 📊 DATA PROBLEMS
- Fresh migration does not match runtime schema definitions.
- Missing unique constraints for phone/address/loan duplication control.
- Many nullable critical columns (phone, role, customer_id, bucket) allow invalid business records.
- Seed dataset may create bucket `0`, conflicting with risk engine expectation (min 1).

## 10. 🧪 EDGE CASE FAILURES
- `/api/settlement` rejects valid zero values because of falsy checks.
- `/api/call-list` defaults userId to `default`, returns empty list silently.
- `/api/osint` may store `confidenceScore` as mixed numeric/string across code paths.
- Search with short/empty queries returns success but no telemetry/error context.

## 11. 📁 UNUSED / DEAD FILES
Likely unused in runtime app flow: `components/ActionButtons.tsx`, `components/ClientCard.tsx`, `components/MapView.tsx`, `components/MultiInput.tsx`, `components/OSINTPanel.tsx`, `lib/response.ts`, `lib/api.ts`, `server/services/search.service.ts` (API route duplicates logic), workflow files in `github/workflows/*` (nonstandard path for GitHub Actions).

## 12. 🔁 DUPLICATED CODE
- Search logic duplicated in `app/api/search/route.ts` and `server/services/search.service.ts`.
- Decision logic duplicated in `server/core/decision.engine.ts` and `server/services/decision.engine.ts`.
- WhatsApp template/link logic duplicated in `components/CallCard.tsx` and `server/core/whatsapp.service.ts`.
- Rate-limit helper duplicated (`server/core/rate-limit.ts`, plus local maps in routes).

## 13. 📌 FILE-BY-FILE FINDINGS
| File | Purpose | Used | Key Findings | Fix |
|---|---|---:|---|---|
| .bolt/mcp.json | Local MCP config | Yes (dev) | No prod impact | Keep out deploy artifact |
| .github/workflows/apply-group-ab.yml | CI automation | Yes | Writes code via shell heredoc; risky maintainability | Replace with reviewed PR workflow |
| github/workflows/apply-group-a.yml | Extra workflow | Likely no | Nonstandard path may not run | Move to `.github/workflows` or remove |
| .gitignore | Ignore rules | Yes | Minimal but okay | Keep |
| next-env.d.ts | Next TS types | Yes | Standard | Keep |
| tailwind.config.ts | Tailwind theme | Yes | Includes `pages` dir not present | Optional cleanup |
| postcss.config.js | PostCSS config | Yes | Standard | Keep |
| next.config.js | Next runtime config | Yes | Security headers minimal only | Add CSP/HSTS/referrer policy |
| tsconfig.json | TS config | Yes | `skipLibCheck:true` hides issues | Tighten in CI |
| drizzle.config.ts | Drizzle kit config | Yes | Fallback local URL may hide missing env | Fail hard in CI |
| setup_db.sql | Manual DB setup | Optional | Stores placeholder passwords | Remove from prod path |
| insert_dataset.sql | Seed dataset | Optional | Non-idempotent inserts, mixed semantics | Add idempotent seed tooling |
| drizzle/migrations/0000_gorgeous_puppet_master.sql | DB migration | Yes | Outdated vs runtime schema | Regenerate migrations |
| drizzle/migrations/meta/* | Migration metadata | Yes | Snapshot stale | Regenerate |
| package.json | Build/deps | Yes | No test/lint scripts beyond lint | Add test/typecheck CI scripts |
| package-lock.json/pnpm-lock.yaml | Locks | Yes | Dual lockfiles cause drift | Keep one package manager |
| lib/env.ts | env access | Yes | Runtime throws when missing | Validate at startup |
| lib/utils.ts | shared utils | Yes | Mostly sound; phone normalize simplistic | E.164 normalization |
| lib/pagination.ts | pagination parser | Yes | No max page guard | Add total/count enforcement |
| lib/api.ts | generic fetch helper | Probably no | No auth headers | Remove or merge |
| lib/api-secure.ts | secure fetch helper | Partial | localStorage token pattern; no refresh | unify with auth SDK |
| lib/auth-store.ts | local token store | Partial | token in localStorage vulnerable to XSS | Prefer httpOnly cookie |
| lib/response.ts | response wrappers | Probably no | Not used by APIs | remove or adopt globally |
| types/index.ts | domain types | Yes | Role/type mismatch with auth middleware | align roles |
| types/bcryptjs.d.ts | module typing | Yes | acceptable | keep |
| server/db/index.ts | DB client | Yes | max:1 pool can bottleneck | tune pool for workload |
| server/db/schema.ts | ORM schema | Yes | Many nullable critical fields; no indexes | add constraints/indexes |
| server/lib/auth.ts | auth guards | Yes | Role enum `admin|agent` incompatible | align with domain roles |
| server/core/decision.engine.ts | decision logic | Yes | Simplistic thresholds | centralize + test |
| server/core/priority.engine.ts | priority sorting | Yes | Assumes `summary` exists | defensive typing |
| server/core/rate-limit.ts | local limiter | Partial | not distributed | Redis-based limiter |
| server/core/cron.service.ts | bucket updater | Partial | blindly increments all rows | scope by due-date rules |
| server/core/whatsapp.service.ts | templates/URL | Partial | hardcoded legal template | move to templating store |
| server/services/auth.service.ts | auth/session service | Yes | No MFA/lockout/rotation | add security controls |
| server/services/client.service.ts | client domain service | Yes | No requester auth context in getClientById | enforce ACL in service |
| server/services/search.service.ts | search service | Likely no | duplicate of API route | remove duplication |
| server/services/risk.service.ts | risk engine | Yes | hardcoded weights | config + experiments |
| server/services/financial.service.ts | financial engine | Yes | business constants static | externalize policy config |
| server/services/osint.service.ts | OSINT enrichment | Yes | simplistic query gen; weak source controls | add provider adapters + schema validation |
| server/services/ai.service.ts | AI + script generation | Yes | no robust JSON schema checking/retry/timeouts | enforce schema + retries |
| server/services/map.service.ts | map/geocode/route | Yes | hardcoded risk/priority | integrate real scoring |
| server/services/daily-call.service.ts | call list | Yes | no phone join, simplistic priority | enrich joins + call logs |
| server/services/legal.service.ts | legal features | Yes | returns text template instead of PDF/document flow | implement doc pipeline |
| server/services/phone-intelligence.service.ts | phone intel | Partial | wildcard phone lookup, mocked WA/TG flags | normalized index + provider integration |
| server/services/whatsapp.service.ts | WA sender/log | Yes | trusts caller-provided userId | derive user from auth |
| server/services/log.service.ts | activity logging | Yes | no schema for severity/request id | structured audit logs |
| server/services/cloudinary.service.ts | image upload infra | Yes | allows remote URL upload path | restrict sources/sign uploads |
| server/services/decision.engine.ts | second decision engine | Partial | conflicting engine logic | deprecate one engine |
| app/layout.tsx | global shell | Yes | no auth-aware nav | add role-based navigation |
| app/page.tsx | main dashboard | Yes | incompatible response assumptions; N+1 | use aggregated endpoint |
| app/dashboard/page.tsx | secondary dashboard | Yes | duplicates dashboard concerns | consolidate pages |
| app/add-client/page.tsx | add client form | Yes | no client-side schema validation | zod + RHF |
| app/client/[id]/page.tsx | client details | Yes | posts actions without auth header | secure API client |
| app/call-mode/page.tsx | call mode UI | Yes | no pagination/filters | add controls |
| app/error.tsx | global error boundary | Yes | logs only to console | add observability integration |
| app/loading.tsx | loading skeleton | Yes | okay | keep |
| app/globals.css | shared styles | Yes | style-only | keep |
| app/api/auth/login/route.ts | login API | Yes | no brute-force protection | add IP+account throttling |
| app/api/auth/me/route.ts | current user API | Yes | requires header token only | support cookie/session strategy |
| app/api/clients/route.ts | list/create clients | Yes | list auth yes, create no transaction & weak validation | zod + tx |
| app/api/client/[id]/route.ts | full profile API | Yes | no auth/ownership check | requireUser + ACL |
| app/api/actions/route.ts | action logger | Yes | no auth/user binding | derive user from token |
| app/api/search/route.ts | search API | Yes | no auth requirement | enforce auth + ownership filter |
| app/api/osint/route.ts | osint API | Yes | no auth check | enforce auth + quotas |
| app/api/upload/route.ts | image upload API | Yes | no auth + folder unsafeness | enforce auth and fixed folder policy |
| app/api/whatsapp/route.ts | WA API | Yes | userId supplied by client | ignore client userId |
| app/api/call-mode/route.ts | AI call API | Yes | no auth, N+1+AI per request | queue/precompute |
| app/api/call-list/route.ts | call list API | Yes | user from header spoofable | require auth identity |
| app/api/map/route.ts | map API | Yes | no auth | enforce role-based access |
| app/api/dashboard/route.ts | KPI API | Yes | no auth and full table scans | secure + aggregate SQL |
| app/api/legal/route.ts | legal API | Yes | broad action multiplexer, weak validation | split endpoints + schemas |
| app/api/settlement/route.ts | settlement API | Yes | falsy validation bug | explicit numeric validation |
| app/api/priority-advanced/route.ts | priority API | Yes | heavy N+1 and no auth | secure + precomputed view |
| components/CallCard.tsx | call row component | Yes | duplicates WA legal template logic | consume shared service |
| components/SearchBar.tsx | search component | Yes | no abort/cancel request | use AbortController |
| components/RiskBadge.tsx | badge UI | Yes | okay | keep |
| components/Timeline.tsx | timeline UI | Maybe | simple | keep/merge |
| components/ActionButtons.tsx | action buttons | No | unused | remove or integrate |
| components/ClientCard.tsx | client card | No | unused | remove or integrate |
| components/MapView.tsx | map component | No | unused + client key exposure | only server-signed map usage |
| components/MultiInput.tsx | multi field | No | unused | remove or integrate |
| components/OSINTPanel.tsx | osint panel | No | expects object shape conflicting with service output arrays | normalize data model |
| public/.gitkeep | keep public dir | Yes | none | keep |

## 14. 📌 FEATURE-BY-FEATURE FINDINGS
- Authentication: implemented (session token table), but inconsistently enforced on routes.
- Google OAuth: missing.
- Session management: present, DB-backed tokens, no rotation/device metadata.
- JWT validation: missing.
- RBAC: partial; role model inconsistent.
- Ownership system: partial in one service only; not globally enforced.
- Client management/add/multi-phone/multi-address/multi-loan: implemented basic CRUD path.
- Client detail page: implemented but insecure API dependency.
- Dashboard: implemented, but duplicated and inefficient.
- Risk engine: implemented deterministic scoring.
- Decision engine: implemented twice, conflicting.
- AI engine: implemented with OpenAI + fallback, weak output guardrails.
- OSINT engine: implemented via SerpAPI, simplistic extraction.
- Phone intelligence: partially implemented, mocked flags.
- Image intelligence: upload exists; reverse/similarity not implemented.
- Map system/route optimization: partial with placeholders.
- Call engine/list/tracking/follow-up: partial, missing robust logging schema and scheduler.
- WhatsApp integration: partial with wa.me link + logging.
- Audit logs/notifications: logs partial; notifications missing.
- Role-specific admin/supervisor/team leader/collector views: missing.
- Hidden admin bypass: named role exists, no end-to-end middleware policy.
- Data import: SQL scripts only, no controlled ingestion API.
- Error handling: present but inconsistent.
- Pagination: partial in `/api/clients`; absent elsewhere.
- Caching: in-memory only.
- Rate limiting: in-memory only and partial routes.
- Input validation/output sanitization: partial and inconsistent.

## 15. 📌 EXACT CODE FIX RECOMMENDATIONS
1. Introduce central `authz.ts` with role matrix + ownership predicates; apply to every mutating/read API.
2. Replace route-level `any` parsing with Zod schemas; reject malformed payloads early.
3. Refactor duplicated engines: keep only `server/core/decision.engine.ts`; delete/redirect service duplicate.
4. Move heavy route orchestration into services; keep API handlers thin.
5. Add DB migration refresh to include `sessions`, `logs`, `legal_cases`, new client/action fields, indexes.
6. Enforce DB constraints: NOT NULL for required columns, unique `(client_id, phone)`, indexes on `owner_id`, `customer_id`, `client_id`, phone normalized column.
7. Implement distributed rate limiting + caching (Upstash Redis).
8. Add secure session strategy (httpOnly, sameSite=strict cookies), drop localStorage token storage.
9. Add observability: request IDs, structured logging, redaction of PII.
10. Replace N+1 fetch patterns with aggregate endpoints (`/api/dashboard/priority`) and SQL joins.
11. Harden AI/OSINT parsing via JSON schema validation and bounded retries/timeouts.
12. Build background job processor for followups/reminders/call schedules.
