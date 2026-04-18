import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getSupabaseEnv, hasSupabaseEnv } from "@/lib/supabase-env";

export const metadata: Metadata = {
  title: "Debt Smart OS",
  description: "AI-powered Debt Collection Intelligence System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  let user: { id: string } | null = null;

  if (hasSupabaseEnv()) {
    const { url, anonKey } = getSupabaseEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;
  }

  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased font-sans">
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="font-black text-xl tracking-tighter text-blue-600">
                DEBT SMART OS
              </Link>

              <div className="flex items-center gap-2 md:gap-4 text-xs font-black uppercase tracking-widest">
                {user ? (
                  <>
                    <Link href="/" className="px-3 py-1 rounded-lg hover:bg-blue-50 text-gray-600 transition">
                      Dashboard
                    </Link>
                    <Link href="/call-mode" className="px-3 py-1 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-100 transition">
                      Call Mode
                    </Link>
                    <LogoutButton />
                  </>
                ) : (
                  <Link href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100 transition">
                    Login
                  </Link>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1">
            <div className="max-w-5xl mx-auto py-4">
              {children}
            </div>
          </main>

          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-100 p-3 flex justify-around md:hidden">
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-center flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition">
              <span className="text-lg">📊</span>
              <span>Home</span>
            </Link>
            <Link href="/call-mode" className="text-[10px] font-black uppercase tracking-widest text-center flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition">
              <span className="text-lg">🔥</span>
              <span>Call Mode</span>
            </Link>
            <Link href="/add-client" className="text-[10px] font-black uppercase tracking-widest text-center flex flex-col items-center gap-1 text-gray-400 hover:text-blue-600 transition">
              <span className="text-lg">➕</span>
              <span>Add</span>
            </Link>
          </div>

          <footer className="text-center text-[10px] font-black uppercase tracking-widest text-gray-300 py-8">
            © {new Date().getFullYear()} Debt Smart Intelligence Systems
          </footer>
        </div>
        <SpeedInsights />
      </body>
    </html>
  );
}
