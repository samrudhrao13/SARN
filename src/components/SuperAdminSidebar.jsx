import React from "react";

export default function SuperAdminSidebar() {
  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  return (
    <div
      style={{
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
      }}
    >
      <h2 style={{ marginBottom: 20, lineHeight: "1.15" }}>
        SARN
        <br />
        TECHNOLOGIES
      </h2>

      <button
        onClick={() => (window.location.href = "/super-admin")}
        style={sidebarBtn}
      >
        Dashboard
      </button>

      <button
        onClick={() => (window.location.href = "/super-admin/users")}
        style={sidebarBtn}
      >
        Manage Users
      </button>

      {/* ✅ NEW */}
      <button
        onClick={() => (window.location.href = "/super-admin/attendance")}
        style={sidebarBtn}
      >
        Attendance
      </button>

      <button onClick={handleLogout} style={logoutBtn}>
        Logout
      </button>
    </div>
  );
}

const sidebarBtn = {
  background: "#1e293b",
  border: "none",
  color: "white",
  padding: "10px",
  borderRadius: 6,
  marginBottom: 10,
  textAlign: "left",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
};

const logoutBtn = {
  marginTop: "10px",
  padding: "10px",
  background: "#e11d48",
  border: "none",
  borderRadius: 6,
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 600,
};
