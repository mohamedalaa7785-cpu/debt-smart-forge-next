import Link from "next/link";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Registration disabled</h1>
        <p className="mt-2 text-sm text-white/70">
          Self-signup is temporarily stopped. Please use your assigned username and password on the login page.
        </p>

        <div className="mt-6 text-sm text-white/70">
          <Link href="/login" className="font-medium text-white underline">
            Go to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
