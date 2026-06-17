import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";


export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 8 }}>SDS Dashboard</h1>
      <p style={{ marginBottom: 24, color: "#475569" }}>
        Quick access to SDS workflows and administrative actions.
      </p>

      {/* ================= QUICK ACTIONS ================= */}
      <div style={grid}>
        <ActionCard
          title="Upload SDS Sheets"
          desc="Upload new SDS Excel files"
          icon="📤"
          color="#2563eb"
          onClick={() => navigate("/admin/upload")}
        />

        <ActionCard
          title="Manage References"
          desc="Search and verify SDS references"
          icon="📁"
          color="#0f766e"
          onClick={() => navigate("/admin/references")}
        />

        <ActionCard
          title="Assign Users"
          desc="Assign SDS work to users"
          icon="👥"
          color="#7c3aed"
          onClick={() => navigate("/admin/assign")}
        />

        <ActionCard
          title="SDS Workflow"
          desc="Track SDS verification progress"
          icon="🔄"
          color="#1e293b"
          onClick={() => navigate("/admin/workflow")}
        />

        <ActionCard
          title="SDS Database"
          desc="View all SDS records"
          icon="🗄️"
          color="#334155"
          onClick={() => navigate("/admin/database")}
        />

        <ActionCard
          title="Billing Summary"
          desc="Billing-ready SDS records"
          icon="💰"
          color="#16a34a"
          onClick={() => navigate("/admin/sds/billing")}
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
