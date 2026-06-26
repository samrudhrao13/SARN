// src/pages/SuperAdmin/UserList.jsx

import React, { useEffect, useState, useRef } from "react";
import api from "../../config/apiClient";
import { StatusDot } from "../../components/StatusPicker";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const pollRef = useRef();

  useEffect(() => {
    loadUsers();
    loadStatuses();
    pollRef.current = setInterval(loadStatuses, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function loadUsers() {
    try {
      const res = await api.get("/users");
      if (!res.data.ok) { setError(res.data.error || "Failed to load users"); return; }
      setUsers(res.data.users);
    } catch { setError("Server error"); }
  }

  async function loadStatuses() {
    try {
      const res = await api.get("/users/statuses");
      if (res.data.ok) setStatuses(res.data.statuses);
    } catch {}
  }

  async function resetPassword(userId) {
    if (!window.confirm(`Reset password for ${userId}?`)) return;
    const res = await api.post("/super-admin/reset-password", { userId });
    if (!res.data.ok) { alert(res.data.error || "Reset failed"); return; }
    alert(`Temporary password for ${userId}:\n\n${res.data.tempPassword}`);
    loadUsers();
  }

  async function deleteUser(userId) {
    if (!window.confirm(`Delete user ${userId}? This is permanent.`)) return;
    const res = await api.post("/super-admin/delete-user", { userId });
    if (!res.data.ok) { alert(res.data.error || "Delete failed"); return; }
    loadUsers();
  }

  const filteredUsers = roleFilter === "ALL"
    ? users
    : users.filter(u => u.role.toUpperCase() === roleFilter);

  function statusLabel(s) {
    const map = {
      available: "Available", away: "Away", busy: "Busy",
      dnd: "Do Not Disturb", "in-call": "In a Call",
      presenting: "Presenting", offline: "Offline",
    };
    return map[s] || s || "—";
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>User List</h2>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Filter by Role</label>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <table border="1" width="100%" cellPadding="8" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th>User ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Must Reset</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length === 0 ? (
            <tr><td colSpan="6" align="center">No users found</td></tr>
          ) : (
            filteredUsers.map(u => {
              const s = statuses[u.userId]?.status || "available";
              return (
                <tr key={u.userId}>
                  <td align="center">{u.userId}</td>
                  <td align="center">{u.name}</td>
                  <td align="center">{u.role}</td>
                  <td align="center">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <StatusDot status={s} size={9} />
                      <span style={{ fontSize: 12 }}>{statusLabel(s)}</span>
                    </span>
                  </td>
                  <td align="center">{u.mustReset ? "Yes" : "No"}</td>
                  <td align="center">
                    <button onClick={() => resetPassword(u.userId)} style={resetBtn}>Reset Password</button>
                    <button onClick={() => deleteUser(u.userId)} style={deleteBtn}>Delete</button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const resetBtn = {
  padding: "4px 10px", marginRight: 6,
  background: "#2563eb", color: "white",
  border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13,
};

const deleteBtn = {
  padding: "4px 10px",
  background: "#dc2626", color: "white",
  border: "none", borderRadius: 4, cursor: "pointer", fontSize: 13,
};
