// src/layouts/AdminLayout.jsx
import React from "react";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        overflow: "hidden", // 🔒 prevent sidebar shift
      }}
    >
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div
        style={{
          marginLeft: "140px",
          padding: "30px",
          width: "calc(100% - 140px)",
          minHeight: "100vh",
          background: "#f8fafc",
          boxSizing: "border-box",
          overflowY: "auto", // ✅ scroll only content
        }}
      >
        {children}
      </div>
    </div>
  );
}
