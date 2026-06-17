import React, { useState } from "react";
import UserLayout from "../../layouts/UserLayout";
import api from "../../config/apiClient";

export default function UserProfile() {
  const stored = localStorage.getItem("sarnUser");
  const user = stored ? JSON.parse(stored) : null;

  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user?.userId) {
    return (
      <UserLayout>
        <p style={{ color: "red" }}>User session expired. Please login again.</p>
      </UserLayout>
    );
  }

  const updatePassword = async () => {
    if (loading) return;

    if (!current || !newPass) {
      setMsg("❌ Enter all fields");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const res = await api.post("/change-password", {
        userId: user.userId,
        oldPassword: current,
        newPassword: newPass,
      });

      if (res.data.ok) {
        setMsg("✅ Password updated successfully!");
        setCurrent("");
        setNewPass("");
      } else {
        setMsg("❌ " + (res.data.error || "Update failed"));
      }
    } catch (err) {
      console.error(err);
      setMsg("❌ Server error");
    }

    setLoading(false);
  };

  return (
    <UserLayout>
      <div
        style={{
          width: "500px",
          background: "#fff",
          padding: "25px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
          marginTop: "20px",
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>User Profile</h2>

        <p style={{ marginBottom: "20px" }}>
          <b>User ID:</b> {user.userId}
        </p>

        <h3 style={{ marginBottom: "10px" }}>Change Password</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            placeholder="Current Password"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            style={inputBox}
          />

          <input
            placeholder="New Password"
            type="password"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            style={inputBox}
          />

          <button
            type="button"
            onClick={updatePassword}
            style={btnPrimary}
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>

        {msg && (
          <p
            style={{
              marginTop: "15px",
              fontWeight: "bold",
              color: msg.startsWith("✅") ? "green" : "red",
            }}
          >
            {msg}
          </p>
        )}
      </div>
    </UserLayout>
  );
}

/* ================= STYLES ================= */

const inputBox = {
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "15px",
};

const btnPrimary = {
  padding: "10px 14px",
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "15px",
};
