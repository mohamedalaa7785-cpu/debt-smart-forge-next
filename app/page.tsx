// app/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/lib/auth";

export default async function HomePage() {
  /* ----------------------------- AUTH CHECK ----------------------------- */

  try {
    const user = await requireUser();

    // 🔥 logged in → dashboard
    if (user) {
      redirect("/dashboard");
    }
  } catch {
    // 🔥 not logged in → show landing
  }

  /* ----------------------------- UI ----------------------------- */

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.4),rgba(2,6,23,0.95))]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full gap-8 lg:grid-cols-2 lg:gap-12">
          <section className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-200 backdrop-blur">
              Debt Smart OS
            </div>

            <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Collections intelligence.
              <span className="block text-sky-300">One system.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Sign in to manage portfolios, review clients, and work from a single
              controlled workspace built for fast collection operations.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/10"
              >
                Sign Up
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Secure login</p>
                <p className="mt-1 text-sm text-slate-400">Supabase session flow</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Role-based access</p>
                <p className="mt-1 text-sm text-slate-400">Admin, leader, collector</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-white">Client tracking</p>
                <p className="mt-1 text-sm text-slate-400">Portfolios and cases</p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/8 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-xl">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">
                  Welcome back
                </p>
                <h2 className="mt-3 text-2xl font-bold text-white">
                  Start from the secure auth screen
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Sign in for existing users or create a new account. The next step is
                  fully routed through the server auth flow.
                </p>

                <div className="mt-5 grid gap-3">
                  <Link
                    href="/login"
                    className="rounded-xl bg-sky-500 px-4 py-3 text-center font-semibold text-white transition hover:bg-sky-400"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center font-semibold text-white transition hover:bg-white/5"
                  >
                    Create Account
                  </Link>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Access
                </p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Collectors</span>
                  <span className="text-emerald-300">Default</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">Admin account</span>
                  <span className="text-sky-300">Role-based</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
