"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "admin" | "supervisor" | "team_leader" | "collector" | "hidden_admin";

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  createdAt?: string;
};

const ROLES: UserRole[] = ["collector", "team_leader", "supervisor", "admin", "hidden_admin"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("collector");

  const [editRole, setEditRole] = useState<Record<string, UserRole>>({});
  const [editName, setEditName] = useState<Record<string, string>>({});
  const [editPassword, setEditPassword] = useState<Record<string, string>>({});

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const list: UserRow[] = json.data || [];
      setUsers(list);

      const roleMap: Record<string, UserRole> = {};
      const nameMap: Record<string, string> = {};
      for (const u of list) {
        roleMap[u.id] = u.role;
        nameMap[u.id] = u.name || "";
      }
      setEditRole(roleMap);
      setEditName(nameMap);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const hiddenAdmins = useMemo(
    () => users.filter((u) => u.role === "hidden_admin").length,
    [users]
  );

  async function createUser() {
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("collector");
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || "Failed to create user");
    }
  }

  async function updateUser(userId: string) {
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: editRole[userId],
          name: editName[userId],
          ...(editPassword[userId] ? { password: editPassword[userId] } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setEditPassword((prev) => ({ ...prev, [userId]: "" }));
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || "Failed to update user");
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm("Delete this user?")) return;
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      await loadUsers();
    } catch (e: any) {
      setError(e?.message || "Failed to delete user");
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">👥 User Management</h1>
        <button 
          onClick={loadUsers} 
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200 transition"
        >
          Refresh List
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
        <p className="text-sm font-bold text-blue-700 uppercase tracking-widest">
          🛡️ Hidden Admins Active: {hiddenAdmins}
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Create New User</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-medium" placeholder="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold text-gray-700" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={createUser} className="w-full py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition uppercase tracking-widest text-xs">
          + Create User Account
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 font-medium text-sm">
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Active Directory</h2>
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading user database...</div>
        ) : users.map((u) => (
          <div key={u.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
            <div className="md:col-span-2">
              <p className="font-bold text-gray-900 truncate">{u.email}</p>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest truncate">{u.id}</p>
            </div>
            <input className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none text-sm font-medium" value={editName[u.id] || ""} onChange={(e) => setEditName((p) => ({ ...p, [u.id]: e.target.value }))} />
            <select className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none text-xs font-black text-gray-700" value={editRole[u.id] || u.role} onChange={(e) => setEditRole((p) => ({ ...p, [u.id]: e.target.value as UserRole }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg outline-none text-sm font-medium" type="password" placeholder="New Password" value={editPassword[u.id] || ""} onChange={(e) => setEditPassword((p) => ({ ...p, [u.id]: e.target.value }))} />
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-blue-50 text-blue-600 font-black rounded-lg hover:bg-blue-100 transition text-[10px] uppercase tracking-widest" onClick={() => updateUser(u.id)}>Save</button>
              <button className="flex-1 py-2 bg-red-50 text-red-600 font-black rounded-lg hover:bg-red-100 transition text-[10px] uppercase tracking-widest" onClick={() => deleteUser(u.id)}>Del</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
