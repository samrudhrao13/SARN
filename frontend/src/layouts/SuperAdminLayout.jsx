// src/layouts/SuperAdminLayout.jsx
import React from "react";
import SuperAdminSidebar from "../components/SuperAdminSidebar";
import CallNotificationOverlay from "../components/CallNotificationOverlay";

export default function SuperAdminLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <SuperAdminSidebar />

      <div
        style={{
          marginLeft: "220px",
          padding: "28px 30px 30px 56px",
          width: "100%",
          minHeight: "100vh",
          background: "#f8f9fc",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
      <CallNotificationOverlay />
    </div>
  );
}
