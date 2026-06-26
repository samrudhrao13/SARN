import React, { useState, useEffect, useRef } from "react";
import api from "../config/apiClient";

export const STATUSES = [
  { key: "available",   label: "Available",       color: "#16a34a" },
  { key: "away",        label: "Away",             color: "#d97706" },
  { key: "busy",        label: "Busy",             color: "#dc2626" },
  { key: "dnd",         label: "Do Not Disturb",   color: "#7c3aed" },
  { key: "in-call",     label: "In a Call",        color: "#2563eb" },
  { key: "presenting",  label: "Presenting",       color: "#0891b2" },
  { key: "offline",     label: "Offline",          color: "#94a3b8" },
];

export function statusColor(s) {
  return STATUSES.find(x => x.key === s)?.color || "#94a3b8";
}

export function StatusDot({ status, size = 10, style = {} }) {
  return (
    <span style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      background: statusColor(status || "available"),
      flexShrink: 0,
      ...style,
    }} />
  );
}

export default function StatusPicker() {
  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const [current, setCurrent] = useState("available");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef();

  useEffect(() => {
    const stored = localStorage.getItem("sarnStatus");
    if (stored) setCurrent(stored);
  }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function pick(key) {
    setOpen(false);
    setCurrent(key);
    localStorage.setItem("sarnStatus", key);
    if (user?.userId) {
      await api.post("/user/status", { userId: user.userId, status: key }).catch(() => {});
    }
  }

  const cur = STATUSES.find(s => s.key === current) || STATUSES[0];

  return (
    <div ref={wrapRef} style={{ position: "relative", marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 8,
          color: "white",
          padding: "8px 10px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
        }}
      >
        <StatusDot status={current} size={10} />
        <span style={{ flex: 1, textAlign: "left" }}>{cur.label}</span>
        <span style={{ color: "#64748b", fontSize: 10 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: 8,
          overflow: "hidden",
          zIndex: 300,
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
        }}>
          {STATUSES.map(s => (
            <button
              key={s.key}
              onClick={() => pick(s.key)}
              style={{
                width: "100%",
                background: s.key === current ? "#334155" : "transparent",
                border: "none",
                color: "white",
                padding: "9px 12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <StatusDot status={s.key} size={9} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
