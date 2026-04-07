"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Also call the API to clear server cookies
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button 
      onClick={handleLogout}
      className="px-3 py-1 rounded-lg hover:bg-red-50 text-red-600 font-bold transition text-xs uppercase tracking-widest"
    >
      Sign Out
    </button>
  );
}
