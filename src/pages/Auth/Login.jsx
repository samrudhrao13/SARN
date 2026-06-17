// src/pages/Auth/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import api from "../../config/apiClient";


export default function Login() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    setError("");

    if (!userId || !password) {
      setError("Enter User ID and Password");
      return;
    }

    try {
      const res = await api.post("/auth/login", {
  userId: userId.trim().toUpperCase(),
  password,
});


      if (!res.data.ok) {
        setError("Invalid User ID or Password");
        return;
      }

      const user = res.data.user;

      // ==============================
      // RESET SESSION (CLEAN START)
      // ==============================
      localStorage.clear();

      // ==============================
      // 🔥 FIX: NORMALIZE ROLE
      // ==============================
      const role = String(user.role).toLowerCase(); // user | admin | superadmin

      // ==============================
      // SAVE SESSION
      // ==============================
      localStorage.setItem("sarnUser", JSON.stringify(user));
      localStorage.setItem("userRole", role);
      localStorage.setItem("userId", user.userId);
      localStorage.setItem("mustReset", user.mustReset ? "true" : "false");

      // ==============================
      // FORCE PASSWORD RESET
      // ==============================
      if (user.mustReset) {
        navigate("/reset-password", { replace: true });
        return;
      }

      // ==============================
      // ROLE BASED REDIRECT
      // ==============================
      if (role === "superadmin") {
        navigate("/super-admin", { replace: true });
      } else if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/user/dashboard", { replace: true });
      }

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setError("Server not reachable. Try again.");
    }
  }

  return (
    <div className="login-container">
      {/* LEFT */}
      <div className="left-section">
        <h1 className="company-title">SARN Technologies</h1>
        <p className="company-about">
          SDS verification, workflow automation, and compliance solutions.
        </p>
        <p className="security-note">
          Secure • Reliable • Industry-Standard
        </p>
      </div>

      {/* RIGHT */}
      <div className="right-section">
        <div className="login-card">
          <h2>Login</h2>

          <input
            type="text"
            placeholder="User ID (SARNxxxx)"
            className="input-box"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="input-box"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="login-btn" onClick={handleLogin}>
            Login
          </button>

          {error && <p className="error-text">{error}</p>}

          <p className="terms-text">
            By logging in, you agree to our Terms & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
