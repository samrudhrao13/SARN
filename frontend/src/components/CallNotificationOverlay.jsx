import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/apiClient";

export default function CallNotificationOverlay() {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const dismissedRef = useRef(new Set());
  const userRef = useRef(null);

  useEffect(() => {
    userRef.current = JSON.parse(localStorage.getItem("sarnUser") || "null");
    const user = userRef.current;
    if (!user?.userId) return;

    async function poll() {
      try {
        const res = await api.get("/calls/active");
        const rooms = res.data?.rooms || [];

        // Priority 1: direct call targeting ME
        const direct = rooms.find(r =>
          r.active &&
          r.callType === "direct" &&
          r.calledUserId === user.userId &&
          !r.participants?.find(p => p.userId === user.userId) &&
          !dismissedRef.current.has(r.roomId)
        );
        if (direct) { setNotification({ ...direct, notifType: "direct" }); return; }

        // Priority 2: group call I'm not in
        const group = rooms.find(r =>
          r.active &&
          r.callType !== "direct" &&
          !r.participants?.find(p => p.userId === user.userId) &&
          !dismissedRef.current.has(r.roomId)
        );
        setNotification(group ? { ...group, notifType: "group" } : null);
      } catch {}
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  async function accept() {
    const user = userRef.current;
    if (!user?.userId || !notification) return;
    await api.post("/calls/join", {
      roomId: notification.roomId,
      userId: user.userId,
      userName: user.name || user.userId,
    }).catch(() => {});
    navigate(`/call/${notification.roomId}`);
    setNotification(null);
  }

  function dismiss() {
    if (notification) {
      dismissedRef.current.add(notification.roomId);
      setNotification(null);
    }
  }

  if (!notification) return null;

  const isDirect = notification.notifType === "direct";

  return (
    <>
      <div style={{
        position: "fixed", bottom: 24, right: 24,
        background: "#0f172a", color: "white",
        borderRadius: 14, padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        zIndex: 8000, minWidth: 280, maxWidth: 340,
        borderLeft: `4px solid ${isDirect ? "#16a34a" : "#2563eb"}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            width: 9, height: 9, borderRadius: "50%", background: "#22c55e",
            display: "inline-block", flexShrink: 0,
            animation: "callpulse 1.5s ease-in-out infinite",
          }} />
          <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
            {isDirect ? "Incoming Call" : "Active Team Call"}
          </span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
          {isDirect
            ? `${notification.createdByName} is calling you`
            : `${notification.createdByName} started a team call`}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 14 }}>
          {(notification.participants?.length || 1)} participant{notification.participants?.length !== 1 ? "s" : ""}
          {notification.participants?.length > 0
            ? " — " + notification.participants.map(p => p.userName).join(", ")
            : ""}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={accept} style={{
            flex: 1, background: isDirect ? "#16a34a" : "#2563eb",
            border: "none", borderRadius: 8, color: "white",
            padding: "10px 0", cursor: "pointer", fontWeight: 700, fontSize: 13,
          }}>
            {isDirect ? "Accept" : "Join Call"}
          </button>
          <button onClick={dismiss} style={{
            background: "#1e293b", border: "none", borderRadius: 8,
            color: "#94a3b8", padding: "10px 14px", cursor: "pointer", fontSize: 13,
          }}>
            {isDirect ? "Decline" : "Dismiss"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes callpulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
      `}</style>
    </>
  );
}
