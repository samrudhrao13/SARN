// src/pages/SuperAdmin/UserList.jsx

import React, { useEffect, useState } from "react";

import api from "../../config/apiClient";


export default function UserList() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const res = await api.get("/users");
const data = res.data;


      if (!data.ok) {
        setError(data.error || "Failed to load users");
        return;
      }

      setUsers(data.users);
    } catch {
      setError("Server error");
    }
  }

  async function resetPassword(userId) {
    if (!window.confirm(`Reset password for ${userId}?`)) return;

    const res = await api.post("/super-admin/reset-password", { userId });
const data = res.data;

    if (!data.ok) {
      alert(data.error || "Reset failed");
      return;
    }

    alert(`Temporary password for ${userId}:\n\n${data.tempPassword}`);
    loadUsers();
  }

  async function deleteUser(userId) {
    if (!window.confirm(`Delete user ${userId}? This is permanent.`)) return;

    const res = await api.post("/super-admin/delete-user", { userId });
const data = res.data;

    if (!data.ok) {
      alert(data.error || "Delete failed");
      return;
    }

    loadUsers();
  }

  const filteredUsers =
    roleFilter === "ALL"
      ? users
      : users.filter(u => u.role.toUpperCase() === roleFilter);

  return (
    <div style={{ padding: 30 }}>
      <h2>User List</h2>

      {/* FILTER */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>
          Filter by Role
        </label>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="ALL">All</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* TABLE — CLASSIC GRID STYLE */}
      <table
        border="1"
        width="100%"
        cellPadding="8"
        cellSpacing="0"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th>User ID</th>
            <th>Name</th>
            <th>Role</th>
            <th>Must Reset</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="5" align="center">
                No users found
              </td>
            </tr>
          ) : (
            filteredUsers.map(u => (
              <tr key={u.userId}>
                <td align="center">{u.userId}</td>
                <td align="center">{u.name}</td>
                <td align="center">{u.role}</td>
                <td align="center">{u.mustReset ? "Yes" : "No"}</td>
                <td align="center">
                  <button
                    onClick={() => resetPassword(u.userId)}
                    style={resetBtn}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => deleteUser(u.userId)}
                    style={deleteBtn}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ================= BUTTON STYLES ================= */

const resetBtn = {
  padding: "4px 10px",
  marginRight: 6,
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};

const deleteBtn = {
  padding: "4px 10px",
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 13,
};
