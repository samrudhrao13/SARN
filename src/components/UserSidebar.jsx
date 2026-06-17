// src/components/UserSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../config/apiClient";

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

const process = location.pathname.startsWith("/user/dq")
  ? "DQ"
  : location.pathname.startsWith("/user/batch")
  ? "BATCH"
  : "SDS";
  /* ================= LOCK ONLY INSIDE WORK FORM ================= */
  const isLocked =
  location.pathname.startsWith("/user/work/") ||
  location.pathname.startsWith("/user/dq/work/") ||
  location.pathname.startsWith("/user/batch/work/");

  function switchProcess(mode) {
  if (isLocked) return;

  if (mode === "SDS") {
    navigate("/user/assigned-sds");
  } else if (mode === "DQ") {
    navigate("/user/dq/tasks");
  } else if (mode === "BATCH") {
    navigate("/user/batch/tasks");
  }
}

  function isActive(path) {
  return (
    location.pathname === path ||
    location.pathname.startsWith(path + "/")
  );
}
  return (
    <div style={container}>
      
      <h2 style={{ marginBottom: 20 }}>SARN TECHNOLOGIES</h2>

      {/* ===== PROCESS SWITCH ===== */}
      <div
  style={{
    display: "flex",
    gap: 5,
    marginBottom: 20,
  }}
>
        <button
          disabled={isLocked}
          onClick={() => switchProcess("SDS")}
          style={{
            ...switchBtn,
            background: process === "SDS" ? "#3b82f6" : "#1e293b",
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
        >
          SDS
        </button>

        <button
          disabled={isLocked}
          onClick={() => switchProcess("DQ")}
          style={{
            ...switchBtn,
            background: process === "DQ" ? "#3b82f6" : "#1e293b",
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
        >
          Data Q
        </button>

        <button
  disabled={isLocked}
  onClick={() => switchProcess("BATCH")}
  style={{
    ...switchBtn,
    background:
      process === "BATCH"
        ? "#3b82f6"
        : "#1e293b",
    opacity: isLocked ? 0.5 : 1,
    cursor: isLocked
      ? "not-allowed"
      : "pointer",
  }}
>
  Batch
</button>
      </div>

      {/* ===== SDS MENU ===== */}
      {process === "SDS" && (
        <>
          <SidebarBtn
            label="Assigned SDS Work"
            path="/user/assigned-sds"
            active={isActive("/user/assigned-sds")}
          />
          <SidebarBtn
              label="Completed Work"
              path="/user/completed-sds"
              active={isActive("/user/completed-sds")}
            />

          <SidebarBtn
            label="Profile"
            path="/user/profile"
            active={isActive("/user/profile")}
          />

          <LogoutBtn />
        </>
      )}

      {/* ===== DQ MENU ===== */}
      {process === "DQ" && (
        <>
          <SidebarBtn
            label="Assigned DQ Work"
            path="/user/dq/tasks"
            active={isActive("/user/dq/tasks")}
          />

          <SidebarBtn
            label="Profile"
            path="/user/profile"
            active={isActive("/user/profile")}
          />

          <LogoutBtn />
        </>
      )}
    
      {process === "BATCH" && (
  <>
    <SidebarBtn
      label="Assigned Batch Work"
      path="/user/batch/tasks"
      active={isActive("/user/batch/tasks")}
    />

    <SidebarBtn
      label="Completed Batch"
      path="/user/batch/completed"
      active={isActive("/user/batch/completed")}
    />

    <SidebarBtn
      label="Profile"
      path="/user/profile"
      active={isActive("/user/profile")}
    />

    <LogoutBtn />
  </>
)}
    </div>
  );
}

/* ================= SUB COMPONENTS ================= */

function SidebarBtn({ label, path, active }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(path)}
      style={{
        background: active ? "#334155" : "#1e293b",
        border: "none",
        color: "white",
        padding: "10px",
        borderRadius: 6,
        marginBottom: 10,
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/* ================= LOGOUT ================= */

function LogoutBtn() {
  const navigate = useNavigate();

  async function logout() {
    try {
      const user = JSON.parse(localStorage.getItem("sarnUser"));

      if (user?.userId) {
        await api.post("/auth/logout", {
          userId: user.userId,
        });
      }
    } catch (err) {
      console.error("Logout error", err);
    }

    // ✅ CLEAN LOCAL LOGOUT
    localStorage.removeItem("sarnUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("mustReset");

    navigate("/login", { replace: true });
  }

  return (
    <button
      onClick={logout}
      style={{
        background: "#e11d48",
        border: "none",
        color: "white",
        padding: "10px",
        borderRadius: 6,
        marginTop: 5,
        cursor: "pointer",
      }}
    >
      Logout
    </button>
  );
}

/* ================= STYLES ================= */

const container = {
  width: "220px",
  height: "100vh",
  background: "#0f172a",
  color: "white",
  padding: "20px",
  position: "fixed",
  left: 0,
  top: 0,
  display: "flex",
  flexDirection: "column",
};

const switchBtn = {
  flex: 1,
  padding: "6px",
  borderRadius: 6,
  border: "none",
  color: "white",
};
