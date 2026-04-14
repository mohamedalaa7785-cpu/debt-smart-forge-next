"use client";

import { useEffect, useState } from "react";

type Me = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  username?: string | null;
};

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (!payload?.success || !payload?.data) {
          throw new Error(payload?.error || "Failed to load profile");
        }
        setMe(payload.data);
      })
      .catch((e) => setError(e?.message || "Failed to load profile"));
  }, []);

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!me) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p><span className="font-semibold">Name:</span> {me.name || "-"}</p>
        <p><span className="font-semibold">Username:</span> {me.username || "-"}</p>
        <p><span className="font-semibold">Email:</span> {me.email}</p>
        <p><span className="font-semibold">Role:</span> {me.role}</p>
      </div>
    </div>
  );
}
