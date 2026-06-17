import React from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";

export default function BatchDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 8 }}>
        Batch Dashboard
      </h1>

      <p
        style={{
          marginBottom: 24,
          color: "#475569",
        }}
      >
        Quick access to Batch workflow
        management and verification.
      </p>

      <div style={grid}>
        <ActionCard
          title="Upload Batch"
          desc="Upload Batch Excel files"
          icon="📤"
          color="#2563eb"
          onClick={() =>
            navigate("/admin/batch/upload")
          }
        />

        <ActionCard
          title="Assign Users"
          desc="Assign verification work"
          icon="👥"
          color="#7c3aed"
          onClick={() =>
            navigate("/admin/batch/assign")
          }
        />

        <ActionCard
          title="Billing Queue"
          desc="Records ready for billing"
          icon="💰"
          color="#16a34a"
          onClick={() =>
            navigate("/admin/batch/billing")
          }
        />

        <ActionCard
          title="Reports"
          desc="Export and review batch records"
          icon="📊"
          color="#0f766e"
          onClick={() =>
            navigate("/admin/batch/report")
          }
        />
      </div>
    </AdminLayout>
  );
}

/* ================= CARD ================= */

function ActionCard({
  title,
  desc,
  icon,
  color,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 28 }}>
        {icon}
      </div>

      <div>
        <h3 style={{ margin: "6px 0" }}>
          {title}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          {desc}
        </p>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(260px,1fr))",
  gap: 20,
};

const card = {
  background: "#ffffff",
  borderRadius: 12,
  padding: 20,
  cursor: "pointer",
  display: "flex",
  gap: 16,
  alignItems: "center",
  boxShadow:
    "0 4px 12px rgba(0,0,0,0.08)",
  transition:
    "transform 0.15s ease, box-shadow 0.15s ease",
};