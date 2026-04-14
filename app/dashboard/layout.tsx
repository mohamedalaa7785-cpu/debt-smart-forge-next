"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type User = {
  role: string;
  name?: string | null;
  username?: string | null;
  isSuperUser?: boolean;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) setUser(data.data);
      })
      .catch(() => setUser(null));
  }, []);

  const baseMenu = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Clients", href: "/dashboard/clients" },
    { name: "OSINT", href: "/dashboard/osint" },
    { name: "Map", href: "/dashboard/map" },
    { name: "AI Intelligence", href: "/dashboard/intelligence" },
    { name: "My Profile", href: "/dashboard/profile" },
  ];

  const adminMenu = [{ name: "Admin Panel", href: "/dashboard/admin/users" }];

  let menu = [...baseMenu];

  if (user?.role === "admin" || user?.role === "hidden_admin" || user?.isSuperUser) {
    menu = [...menu, ...adminMenu];
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-black p-5 text-white flex flex-col justify-between">
        <div>
          <h2 className="mb-6 text-2xl font-bold">Debt System</h2>

          <nav className="space-y-2">
            {menu.map((item) => {
              const active = path === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded px-3 py-2 transition ${
                    active ? "bg-gray-700" : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="text-xs text-gray-400">
          Logged as: {user?.name || user?.username || "loading..."} ({user?.role || "..."})
        </div>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
