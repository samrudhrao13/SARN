// src/components/AdminSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../config/apiClient";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const process = location.pathname.startsWith("/admin/dq")
  ? "DATA_QUEUE"
  : location.pathname.startsWith("/admin/batch")
  ? "BATCH"
  : "SDS";
  
  function switchProcess(mode) {
  localStorage.setItem("workflowProcess", mode);

  if (mode === "SDS") {
    navigate("/admin/dashboard");
  } else if (mode === "DATA_QUEUE") {
    navigate("/admin/dq/dashboard");
  } else if (mode === "BATCH") {
    navigate("/admin/batch/dashboard");
  }
}
  const isActive = (path) =>
  location.pathname === path ||
  location.pathname.startsWith(path + "/");

  return (
    <div style={styles.sidebar}>
      {/* ===== HEADER ===== */}
      <div style={titleStyle}>
        <span>SARN</span>
        <br />
        <span>TECHNOLOGIES</span>
      </div>

      {/* ===== PROCESS SWITCH ===== */}
      <div style={styles.switchRow}>
        <button
          onClick={() => switchProcess("SDS")}
          style={processBtn(process === "SDS")}
        >
          SDS
        </button>
        <button
          onClick={() => switchProcess("DATA_QUEUE")}
          style={processBtn(process === "DATA_QUEUE")}
        >
          Data Queue
        </button>
         <button
            onClick={() => switchProcess("BATCH")}
            style={processBtn(process === "BATCH")}
          >
            Batch
          </button>
      </div>

      {/* ===== MENU ===== */}
      <div style={styles.menu}>
        {process === "SDS" && (
          <>
            <SidebarBtn label="Dashboard" path="/admin/dashboard" active={isActive("/admin/dashboard")} />
            <SidebarBtn label="Upload Sheets" path="/admin/upload" active={isActive("/admin/upload")} />
            <SidebarBtn label="References" path="/admin/references" active={isActive("/admin/references")} />
            <SidebarBtn label="Assign Users" path="/admin/assign" active={isActive("/admin/assign")} />
            <SidebarBtn label="Workflow Control" path="/admin/workflow" active={isActive("/admin/workflow")} />
            <SidebarBtn label="Database" path="/admin/database" active={isActive("/admin/database")} />
            <SidebarBtn label="Billing" path="/admin/sds/billing" active={isActive("/admin/sds/billing")} />
            <LogoutBtn />
          </>
        )}

        {process === "DATA_QUEUE" && (
          <>
            <SidebarBtn label="DQ Dashboard" path="/admin/dq/dashboard" active={isActive("/admin/dq/dashboard")} />
            <SidebarBtn label="Upload File" path="/admin/dq/upload" active={isActive("/admin/dq/upload")} />
            <SidebarBtn label="DQ List" path="/admin/dq/list" active={isActive("/admin/dq/list")} />
            <SidebarBtn label="Assign Users" path="/admin/dq/assign" active={isActive("/admin/dq/assign")} />
            <SidebarBtn label="Workflow Control" path="/admin/dq/workflow" active={isActive("/admin/dq/workflow")} />
            <SidebarBtn label="Database" path="/admin/dq/database" active={isActive("/admin/dq/database")} />
            <SidebarBtn label="Billing" path="/admin/dq/billing" active={isActive("/admin/dq/billing")} />
            <LogoutBtn />
          </>
        )}

        {process === "BATCH" && (
          <>
            <SidebarBtn
              label="Batch Dashboard"
              path="/admin/batch/dashboard"
              active={isActive("/admin/batch/dashboard")}
            />

            <SidebarBtn
              label="Upload Batch"
              path="/admin/batch/upload"
              active={isActive("/admin/batch/upload")}
            />

            <SidebarBtn
              label="Assign Users"
              path="/admin/batch/assign"
              active={isActive("/admin/batch/assign")}
            />

            <SidebarBtn
              label="Billing"
              path="/admin/batch/billing"
              active={isActive("/admin/batch/billing")}
            />

            <SidebarBtn
              label="Reports"
              path="/admin/batch/report"
              active={isActive("/admin/batch/report")}
            />

            <LogoutBtn />
          </>
        )}
      </div>
    </div>
  );
}

/* ===== BUTTONS ===== */

function SidebarBtn({ label, path, active }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        background: active ? "#334155" : "#1e293b",
        border: "none",
        color: "white",
        padding: "8px 10px",
        borderRadius: 6,
        marginBottom: 4,
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
        fontSize: "14px",
      }}
    >
      {label}
    </button>
  );
}

function LogoutBtn() {
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      const user = JSON.parse(localStorage.getItem("sarnUser"));
      if (user?.userId) {
        await api.post("/auth/logout", {
          userId: user.userId,
        });
      }
    } catch {
      // ignore logout errors
    }

    localStorage.clear();
    navigate("/login");
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        marginTop: 8,
        padding: "8px 10px",
        background: "#e11d48",
        border: "none",
        borderRadius: 6,
        color: "white",
        cursor: "pointer",
        width: "100%",
        fontSize: "14px",
      }}
    >
      Logout
    </button>
  );
}

/* ===== STYLES ===== */

const styles = {
  sidebar: {
    width: "220px",
    height: "100vh",
    background: "#0f172a",
    color: "white",
    padding: "14px",
    position: "fixed",
    top: 0,
    left: 0,
  },
  switchRow: {
    display: "flex",
    gap: 6,
    marginBottom: 10,
  },
  menu: {
    overflowY: "auto",
  },
};

const titleStyle = {
  fontSize: "20px",
  fontWeight: "700",
  lineHeight: "1.15",
  marginBottom: "12px",
  letterSpacing: "0.5px",
};

const processBtn = (active) => ({
  flex: 1,
  background: active ? "#3b82f6" : "#1e293b",
  padding: "6px",
  borderRadius: 6,
  border: "none",
  color: "white",
  cursor: "pointer",
  fontSize: "13px",
});
