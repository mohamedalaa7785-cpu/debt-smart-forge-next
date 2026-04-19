# Required Environment Variables

Set these values in local `.env.local` and deployment providers (Vercel / Supabase / GitHub Actions secrets).

## Core required

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_URL` (optional unified Cloudinary URL)

## Auth / app routing

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `HIDDEN_ADMIN_EMAILS`

## Search / intelligence / maps

- `SERPAPI_API_KEY`
- `TRUECALLER_API_KEY`
- `TRUECALLER_LOOKUP_URL`
- `TRUECALLER_API_BASE` (optional base URL override)
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

## Caching / queues

- `UPSTASH_REDIS_REST_URL` (optional, for cache + rate limit)
- `UPSTASH_REDIS_REST_TOKEN` (optional, for cache + rate limit)
- `REDIS_URL` (optional, for BullMQ queue workers)

## Notes

- Upstash Redis is used for distributed cache/rate limit; if unavailable, local in-memory fallback is used.
- `REDIS_URL` is intentionally separate for queue workers and can point to a different Redis instance.

## Post-deploy checks

1. Register a user from `POST /api/auth/register` (or `POST /api/auth/signup`).
2. Login from `POST /api/auth/login`.
3. Call an authenticated endpoint and verify scoped data access.
4. Verify dashboard metrics, clients list, and client detail pages load.
