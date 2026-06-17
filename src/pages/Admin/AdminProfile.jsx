import React, { useState } from "react";
import api from "../../config/apiClient";

export default function AdminProfile() {
  const admin = JSON.parse(localStorage.getItem("sarnUser"));
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState("");

  const updatePassword = async () => {
    if (!current || !newPass) {
      setMsg("Enter all fields");
      return;
    }

    try {
      const res = await api.post("/change-password", {
        email: admin.email,
        currentPassword: current,
        newPassword: newPass,
      });

      const data = res.data;
      setMsg(data.ok ? "Password updated successfully!" : data.error);
    } catch (err) {
      console.error("CHANGE PASSWORD ERROR:", err);
      setMsg("Server error");
    }
  };

  return (
    <div>
      <h2>Admin Profile</h2>
      <p>
        <b>Email:</b> {admin.email}
      </p>

      <h3>Change Password</h3>

      <input
        placeholder="Current Password"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
      />

      <input
        placeholder="New Password"
        type="password"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
      />

      <button onClick={updatePassword}>Update Password</button>

      {msg && <p>{msg}</p>}
    </div>
  );
}
