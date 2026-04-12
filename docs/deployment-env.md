# Required Environment Variables

Set these values in local `.env.local` and deployment providers (Vercel / Supabase / GitHub Actions secrets):

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (e.g. `7d`)
- `BCRYPT_SALT_ROUNDS` (e.g. `10`)
- `OPENAI_API_KEY` (if AI features are enabled)
- `SERPAPI_API_KEY` (if OSINT enrichment is enabled)
- `CLOUDINARY_URL`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_SECRET`
- `GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_APP_URL`

## Post-deploy checks

1. Register a new user from `POST /api/auth/register`.
2. Login from `POST /api/auth/login`.
3. Call an authenticated endpoint with the returned bearer token.
4. Verify session records are created in `public.sessions`.
