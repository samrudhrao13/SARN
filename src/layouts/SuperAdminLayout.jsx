// src/layouts/SuperAdminLayout.jsx
import React from "react";
import SuperAdminSidebar from "../components/SuperAdminSidebar";

export default function SuperAdminLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <SuperAdminSidebar />

      <div
        style={{
          marginLeft: "220px",
          padding: "30px",
          width: "100%",
          minHeight: "100vh",
          background: "#f8f9fc",
        }}
      >
        {children}
      </div>
    </div>
  );
}
