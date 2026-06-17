// src/pages/Auth/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import "./reset.css";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";


export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // -------------------------------
  // GUARD: ONLY TEMP USERS ALLOWED
  // -------------------------------
  useEffect(() => {
    const mustReset = localStorage.getItem("mustReset");
    const userId = localStorage.getItem("userId");

    if (!userId || mustReset !== "true") {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  async function handleReset() {
    setMessage("");

    const userId = localStorage.getItem("userId");

    if (!userId || !newPassword) {
      setMessage("❌ Enter a new password");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/reset", {
  userId,
  newPassword,
});


      if (res.data.ok) {
        setMessage("✅ Password updated. Redirecting to login...");

        // -------------------------------
        // FORCE LOGOUT AFTER RESET
        // -------------------------------
        setTimeout(() => {
          localStorage.clear();
          navigate("/login", { replace: true });
        }, 1200);
      } else {
        setMessage("❌ Failed to update password");
      }
    } catch (err) {
      console.error("RESET ERROR:", err);
      setMessage("❌ Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reset-container">
      <div className="reset-card">
        <h2>Reset Password</h2>

        <input
          type="password"
          placeholder="Enter New Password"
          className="input-box"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <button
          className="reset-btn"
          onClick={handleReset}
          disabled={loading}
        >
          {loading ? "Updating..." : "Reset Password"}
        </button>

        {message && <p className="reset-message">{message}</p>}
      </div>
    </div>
  );
}
