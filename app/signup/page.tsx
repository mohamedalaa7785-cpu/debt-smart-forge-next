"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          username: username || undefined,
          email,
          password,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Signup failed.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  async function signupWithGoogle() {
    setGoogleLoading(true);
    setError("");

    const redirectTo = process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL || `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Create account</h1>
        <p className="mt-2 text-sm text-white/70">
          Sign up with email and password, or continue with Google. Username is optional profile data.
        </p>

        <button
          type="button"
          onClick={signupWithGoogle}
          disabled={googleLoading}
          className="mt-4 w-full rounded-lg border border-white/20 bg-white/10 p-2 text-sm font-semibold disabled:opacity-60"
        >
          {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input className="w-full rounded-lg bg-black/30 border border-white/20 p-2" placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded-lg bg-black/30 border border-white/20 p-2" placeholder="Username (optional)" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="w-full rounded-lg bg-black/30 border border-white/20 p-2" placeholder="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded-lg bg-black/30 border border-white/20 p-2" placeholder="Password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />

          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          <button disabled={loading} className="w-full rounded-lg bg-white text-black font-semibold p-2 disabled:opacity-60" type="submit">
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <div className="mt-6 text-sm text-white/70">
          <Link href="/login" className="font-medium text-white underline">
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
