import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";

export default function DQDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 8 }}>DQ Dashboard</h1>
      <p style={{ marginBottom: 24, color: "#475569" }}>
        Quick access to Data Queue workflows and actions.
      </p>

      {/* ================= QUICK ACTIONS ================= */}
      <div style={grid}>
        <ActionCard
          title="Upload DQ Sheet"
          desc="Upload new Data Queue Excel sheets"
          color="#2563eb"
          icon="📤"
          onClick={() => navigate("/admin/dq/upload")}
        />

        <ActionCard
          title="Assign Work"
          desc="Assign DQ records to users"
          color="#7c3aed"
          icon="👥"
          onClick={() => navigate("/admin/dq/assign")}
        />

        <ActionCard
          title="DQ Workflow"
          desc="Track assigned & completed work"
          color="#0f766e"
          icon="🔄"
          onClick={() => navigate("/admin/dq/workflow")}
        />

        <ActionCard
          title="DQ Database"
          desc="View all DQ records & status"
          color="#1e293b"
          icon="🗄️"
          onClick={() => navigate("/admin/dq/database")}
        />

        <ActionCard
          title="Billing Summary"
          desc="Billing-ready & pending records"
          color="#16a34a"
          icon="💰"
          onClick={() => navigate("/admin/dq/billing")}
        />

        <ActionCard
          title="Reports & Export"
          desc="Export DQ workflow data"
          color="#ea580c"
          icon="📊"
          onClick={() => navigate("/admin/dq/reports")}
        />
      </div>
    </AdminLayout>
  );
}

/* ================= CARD COMPONENT ================= */

function ActionCard({ title, desc, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...card,
        borderLeft: `6px solid ${color}`,
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <h3 style={{ margin: "6px 0" }}>{title}</h3>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{desc}</p>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
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
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  transition: "transform 0.15s ease, box-shadow 0.15s ease",
};
