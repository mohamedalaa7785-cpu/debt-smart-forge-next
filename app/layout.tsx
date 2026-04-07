import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

/* =========================
   META (SEO + SYSTEM IDENTITY)
========================= */
export const metadata: Metadata = {
  title: "Debt Smart OS",
  description: "AI-powered Debt Collection Intelligence System",
};

/* =========================
   ROOT LAYOUT
========================= */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-gray-900 antialiased">

        {/* =========================
            APP CONTAINER
        ========================= */}
        <div className="min-h-screen flex flex-col">

          {/* =========================
              HEADER (NAVBAR)
          ========================= */}
          <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

              {/* LOGO */}
              <Link href="/" className="font-bold text-lg">
                Debt Smart OS
              </Link>

              {/* NAV */}
              <div className="flex items-center gap-3 text-sm">

                <Link
                  href="/"
                  className="px-3 py-1 rounded-lg hover:bg-gray-100"
                >
                  Dashboard
                </Link>

                <Link
                  href="/add-client"
                  className="px-3 py-1 rounded-lg bg-black text-white"
                >
                  + Add
                </Link>


                <Link
                  href="/dashboard/admin/users"
                  className="px-3 py-1 rounded-lg hover:bg-gray-100"
                >
                  Admin
                </Link>

                <Link
                  href="/login"
                  className="px-3 py-1 rounded-lg hover:bg-gray-100"
                >
                  Login
                </Link>
              </div>
            </div>
          </header>

          {/* =========================
              MAIN CONTENT
          ========================= */}
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 py-4">
              {children}
            </div>
          </main>

          {/* =========================
              MOBILE ACTION BAR 🔥
          ========================= */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t p-2 flex justify-around md:hidden">

            <Link
              href="/"
              className="text-xs text-center flex flex-col"
            >
              📊
              <span>Dashboard</span>
            </Link>

            <Link
              href="/add-client"
              className="text-xs text-center flex flex-col"
            >
              ➕
              <span>Add</span>
            </Link>
          </div>

          {/* =========================
              FOOTER
          ========================= */}
          <footer className="text-center text-xs text-gray-400 py-3">
            © {new Date().getFullYear()} Debt Smart OS
          </footer>
        </div>
      </body>
    </html>
  );
                }
