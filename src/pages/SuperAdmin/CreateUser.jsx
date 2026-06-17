import React, { useState } from "react";
import SuperAdminLayout from "../../layouts/SuperAdminLayout";
import api from "../../config/apiClient";




export default function CreateUser() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [tempPassword, setTempPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setMessage("");
    setTempPassword("");
    setUserId("");

    if (!name || !role) {
      setMessage("❌ Name & Role required");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/create-user", {

        name: name.trim(),
        role, // admin | user | dq_user (backend supports this)
      });

      if (!res.data.ok) {
        setMessage("❌ " + (res.data.error || "Failed to create user"));
      } else {
        setUserId(res.data.userId);
        setTempPassword(res.data.tempPassword);
        setMessage("✅ User created successfully!");

        setName("");
        setRole("user");
      }
    } catch (err) {
      console.error("CREATE USER ERROR:", err);
      setMessage("❌ Server error");
    }

    setLoading(false);
  }

  return (
    <SuperAdminLayout>
      <h1 style={{ fontSize: 32, fontWeight: 800 }}>
        Create Admin / User
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 12,
          width: "85%",
          maxWidth: 850,
          marginTop: 25,
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <input
          type="text"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={input}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={input}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="dq_user">DQ User</option>
        </select>

        <button onClick={handleCreate} disabled={loading} style={btn}>
          {loading ? "Creating..." : "Create User"}
        </button>

        {message && (
          <p
            style={{
              marginTop: 15,
              color: message.includes("❌") ? "red" : "green",
            }}
          >
            {message}
          </p>
        )}

        {userId && (
          <div style={passwordBox}>
            <p>
              <b>User ID:</b> {userId}
            </p>
            <p>
              <b>Temp Password:</b> {tempPassword}
            </p>
            <p style={{ marginTop: 10, color: "#555" }}>
              ⚠ Ask the user to login and reset password immediately.
            </p>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

const input = {
  width: "100%",
  padding: "12px",
  marginTop: 18,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 15,
};

const btn = {
  marginTop: 25,
  padding: "12px 22px",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontSize: 16,
};

const passwordBox = {
  marginTop: 20,
  padding: 15,
  borderRadius: 8,
  background: "#eef4ff",
  border: "1px solid #cddaff",
};
