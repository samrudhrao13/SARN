// src/layouts/AdminLayout.jsx
import React from "react";
import AdminSidebar from "../components/AdminSidebar";
import ChatBot from "../components/ChatBot";
import CallNotificationOverlay from "../components/CallNotificationOverlay";

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
          marginLeft: "220px",
          padding: "28px 30px 30px 16px",
          width: "calc(100% - 220px)",
          minHeight: "100vh",
          background: "#f8fafc",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        {children}
      </div>

      {/* Floating Translation Assistant */}
      <ChatBot />
      <CallNotificationOverlay />
    </div>
  );
}
