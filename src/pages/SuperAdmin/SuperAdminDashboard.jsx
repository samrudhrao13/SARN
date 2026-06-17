// src/pages/SuperAdmin/SuperAdminDashboard.jsx
import React, { useState } from "react";
import api from "../../config/apiClient";


export default function SuperAdminDashboard() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [userId, setUserId] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function createUser() {
    setMessage("");
    setUserId("");
    setTempPassword("");

    if (!name.trim()) {
      setMessage("❌ Name required");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/create-user", {
  name: name.trim(),
  role,
});

const data = res.data;


      if (!data.ok) {
        setMessage("❌ " + (data.error || "Failed to create user"));
        return;
      }

      setUserId(data.userId);
      setTempPassword(data.tempPassword);
      setMessage("✅ User created successfully");

      setName("");
      setRole("user");
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setMessage("❌ Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Super Admin Dashboard</h1>

      <div style={box}>
        <h2>Create Admin / User</h2>

        <input
          style={input}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          style={input}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button style={btn} onClick={createUser} disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </button>

        {message && <p>{message}</p>}

        {userId && (
          <div style={creds}>
            <p><b>User ID:</b> {userId}</p>
            <p><b>Temp Password:</b> {tempPassword}</p>
            <p style={{ color: "#475569", fontSize: 13 }}>
              User must login and reset password
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const box = {
  background: "#fff",
  padding: 25,
  borderRadius: 10,
  width: 420,
};

const input = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
};

const btn = {
  padding: "12px 20px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const creds = {
  marginTop: 15,
  padding: 12,
  background: "#f1f5f9",
  borderRadius: 6,
};
