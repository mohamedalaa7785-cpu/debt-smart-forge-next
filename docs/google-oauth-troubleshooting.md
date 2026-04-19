# Google OAuth 401 `invalid_client` (Supabase)

If users see Google error **"Access blocked: Authorization Error"** with **`401: invalid_client`** and message **"The OAuth client was not found."**, the issue is usually in provider configuration (not in user credentials).

## Root cause

Supabase forwards users to Google OAuth using the client configured in:

- Supabase Dashboard → **Authentication** → **Providers** → **Google**

This error means the configured **Google Client ID** is missing, deleted, wrong project, or does not match the configured secret.

## Fix checklist

1. In **Google Cloud Console**:
   - Open the project that owns your OAuth app.
   - Verify an OAuth 2.0 client exists and is active.
   - Copy the exact **Client ID** and **Client Secret**.

2. In **Supabase Dashboard**:
   - Authentication → Providers → Google
   - Enable Google provider.
   - Paste the same Client ID/Secret from Google Cloud.
   - Save.

3. Verify **Authorized redirect URIs** in Google Cloud include your callback:
   - `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   - If using custom domain/auth URL, add that callback as well.

4. Confirm app redirect target:
   - `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL` should point to your app callback route (for this project: `/auth/callback`).
   - Example: `https://your-app-domain.com/auth/callback`

5. If an environment does not yet have a valid Google OAuth client, disable Google button temporarily:
   - `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=false`

## Why this repo change helps

The login/signup pages now support disabling Google OAuth per environment using:

- `NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=false`

This prevents users from entering a known broken flow until provider setup is fixed.
