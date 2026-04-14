"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  role: string;
  name?: string | null;
  is_super_user?: boolean;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) setUser(data.data);
      });
  }, []);

  /* ---------------- MENU ---------------- */
  const baseMenu = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Clients", href: "/dashboard/clients" },
    { name: "OSINT", href: "/dashboard/osint" },
  ];

  const adminMenu = [
    { name: "Admin Panel", href: "/dashboard/admin" },
  ];

  /* ---------------- ROLE LOGIC ---------------- */
  let menu = [...baseMenu];

  if (user?.role === "admin" || user?.role === "hidden_admin") {
    menu = [...menu, ...adminMenu];
  }

  // 👑 hidden super user (محمد)
  if (user?.is_super_user) {
    menu = [...menu, ...adminMenu];
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="w-64 bg-black text-white p-5 flex flex-col justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-6">Debt System</h2>

          <nav className="space-y-2">
            {menu.map((item) => {
              const active = path === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-2 rounded transition ${
                    active
                      ? "bg-gray-700"
                      : "hover:bg-gray-800 text-gray-300"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* FOOTER */}
        <div className="text-xs text-gray-400">
          Logged as: {user?.name || "loading..."} ({user?.role || "..."})
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
