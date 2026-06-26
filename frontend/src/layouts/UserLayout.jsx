import React, { useEffect } from "react";
import UserSidebar from "../components/UserSidebar";
import ChatBot from "../components/ChatBot";
import CallNotificationOverlay from "../components/CallNotificationOverlay";
import api from "../config/apiClient";

export default function UserLayout({ children }) {
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
    if (!user?.userId) return;

    const PING_MS = 3 * 60 * 1000;
    let lastRealActivity = Date.now();

    const onActivity = () => { lastRealActivity = Date.now(); };
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown",   onActivity, { passive: true });
    window.addEventListener("click",     onActivity, { passive: true });
    window.addEventListener("scroll",    onActivity, { passive: true });

    const ping = () => {
      if (Date.now() - lastRealActivity < PING_MS) {
        api.post("/user/activity-ping", { userId: user.userId }).catch(() => {});
      }
    };

    ping();
    const id = setInterval(ping, PING_MS);

    return () => {
      clearInterval(id);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown",   onActivity);
      window.removeEventListener("click",     onActivity);
      window.removeEventListener("scroll",    onActivity);
    };
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <UserSidebar />
      <div style={{ width: "220px", minWidth: "220px", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, padding: "20px 20px 20px 16px", minHeight: "100vh", background: "#f8fafc" }}>
        {children}
      </div>
      <ChatBot />
      <CallNotificationOverlay />
    </div>
  );
}
