# Vercel Deployment Checklist

## 1) Project settings
- Framework preset: **Next.js**
- Build command: `npm run build`
- Install command: `npm install`

## 2) Environment variables
Copy all variables from `.env.example` to Vercel Project Settings → Environment Variables.

Minimum required for app boot:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Required for admin users API:
- `SUPABASE_SERVICE_ROLE_KEY`

Required for AI / OSINT features:
- `OPENAI_API_KEY`
- `SERPAPI_API_KEY`
- `GOOGLE_MAPS_API_KEY`

Required for uploads:
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Optional:
- `REDIS_URL` (queue worker usage)

## 3) Pre-deploy checks
Run locally before pushing:

```bash
npx tsc --noEmit
npm run build
```

> Note: `npm run lint` requires `eslint` to be available in your environment.

## 4) Post-deploy smoke tests
- Login / signup
- Dashboard data load
- Client details page (verify auto-refresh and timeline updates)
- `/api/osint` and `/api/recommendation`
- Admin users management APIs
