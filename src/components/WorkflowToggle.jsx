import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function WorkflowToggle() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDQ = location.pathname.startsWith("/user/dq");
  const isBatch = location.pathname.startsWith("/user/batch");

  const isLocked =
    location.pathname.startsWith("/user/dq/work/") ||
    location.pathname.startsWith("/user/work/") ||
    location.pathname.startsWith("/user/batch/work/");

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        background: "#fff",
        padding: "8px 14px",
        borderRadius: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      {/* SDS */}
      <button
        disabled={isLocked}
        onClick={() => navigate("/user/tasks")}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          background:
            !isDQ && !isBatch
              ? "#2563eb"
              : "#e5e7eb",
          color:
            !isDQ && !isBatch
              ? "#fff"
              : "#333",
          border: "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          opacity: isLocked ? 0.5 : 1,
        }}
      >
        SDS
      </button>

      {/* DQ */}
      <button
        disabled={isLocked}
        onClick={() => navigate("/user/dq/tasks")}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          background: isDQ
            ? "#2563eb"
            : "#e5e7eb",
          color: isDQ
            ? "#fff"
            : "#333",
          border: "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          opacity: isLocked ? 0.5 : 1,
        }}
      >
        Data Queue
      </button>

      {/* Batch */}
      <button
        disabled={isLocked}
        onClick={() => navigate("/user/batch/tasks")}
        style={{
          padding: "6px 14px",
          borderRadius: 8,
          background: isBatch
            ? "#2563eb"
            : "#e5e7eb",
          color: isBatch
            ? "#fff"
            : "#333",
          border: "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          opacity: isLocked ? 0.5 : 1,
        }}
      >
        Batch
      </button>
    </div>
  );
}