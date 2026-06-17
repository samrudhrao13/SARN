import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const navItem = {
    padding: "12px 20px",
    color: "#fff",
    display: "block",
    textDecoration: "none",
    borderRadius: 6,
    marginBottom: 8,
    cursor: "pointer",
  };

  const active = {
    background: "#444",
  };

  function logout() {
    localStorage.clear();
    navigate("/login", { replace: true });
  }

  return (
    <div
      style={{
        width: 220,
        background: "#111",
        color: "#fff",
        minHeight: "100vh",
        padding: 20,
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <h2 style={{ marginBottom: 30 }}>ADMIN</h2>

      <Link
        to="/admin/dashboard"
        style={{ ...navItem, ...(pathname.includes("dashboard") && active) }}
      >
        Dashboard
      </Link>

      <Link
        to="/admin/upload"
        style={{ ...navItem, ...(pathname.includes("upload") && active) }}
      >
        Upload Excel
      </Link>

      <Link
        to="/admin/references"
        style={{ ...navItem, ...(pathname.includes("references") && active) }}
      >
        References
      </Link>

      <Link
        to="/admin/assign"
        style={{ ...navItem, ...(pathname.includes("assign") && active) }}
      >
        Assign Users
      </Link>

      <Link
        to="/admin/workflow"
        style={{ ...navItem, ...(pathname.includes("workflow") && active) }}
      >
        Workflow
      </Link>

      <Link
        to="/admin/users"
        style={{ ...navItem, ...(pathname.includes("users") && active) }}
      >
        Manage Users
      </Link>

      {/* ✅ FIXED LOGOUT */}
      <div
        onClick={logout}
        style={{
          ...navItem,
          background: "#c70039",
          marginTop: 40,
          textAlign: "center",
        }}
      >
        Logout
      </div>
    </div>
  );
}
