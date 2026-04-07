"use client";

import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-secure";

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
      const res = await apiGet("/api/admin/users");
      const list: UserRow[] = res.data || [];
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
      await apiPost("/api/admin/users", {
        email: newEmail,
        name: newName,
        password: newPassword,
        role: newRole,
      });
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
      await apiPatch("/api/admin/users", {
        userId,
        role: editRole[userId],
        name: editName[userId],
        ...(editPassword[userId] ? { password: editPassword[userId] } : {}),
      });
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
      await apiDelete("/api/admin/users", { userId });
      await loadUsers();
    } catch (e: any) {
      setError(e?.message || "Failed to delete user");
    }
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <button onClick={loadUsers} className="btn">Refresh</button>
      </div>

      <div className="card">
        <p className="text-sm text-gray-500">Hidden Admins: {hiddenAdmins}</p>
      </div>

      <div className="card space-y-2">
        <h2 className="font-semibold">Create User</h2>
        <div className="grid md:grid-cols-4 gap-2">
          <input className="input" placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <input className="input" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input className="input" placeholder="Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <button onClick={createUser} className="btn btn-primary">Create</button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {loading ? <div className="card">Loading...</div> : users.map((u) => (
          <div key={u.id} className="card grid md:grid-cols-6 gap-2 items-center">
            <div className="md:col-span-2">
              <p className="font-semibold">{u.email}</p>
              <p className="text-xs text-gray-500">{u.id}</p>
            </div>
            <input className="input" value={editName[u.id] || ""} onChange={(e) => setEditName((p) => ({ ...p, [u.id]: e.target.value }))} />
            <select className="input" value={editRole[u.id] || u.role} onChange={(e) => setEditRole((p) => ({ ...p, [u.id]: e.target.value as UserRole }))}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input className="input" type="password" placeholder="new password" value={editPassword[u.id] || ""} onChange={(e) => setEditPassword((p) => ({ ...p, [u.id]: e.target.value }))} />
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={() => updateUser(u.id)}>Save</button>
              <button className="btn btn-danger" onClick={() => deleteUser(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
