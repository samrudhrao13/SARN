import React, { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient"; 

export default function DQReports() {
  const [sheet, setSheet] = useState("");

  /* ================= HELPERS ================= */
  const normalizeSheet = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

  /* ================= EXPORT ACTIONS ================= */

  const exportExcel = () => {
    const s = normalizeSheet(sheet);
    if (!s) return alert("Enter sheet name");
    window.open(
      `${api.defaults.baseURL}/dq/export-excel?sheet=${s}`,
      "_blank"
    );
  };

  const exportPDF = () => {
    const s = normalizeSheet(sheet);
    if (!s) return alert("Enter sheet name");
    window.open(
      `${api.defaults.baseURL}/dq/export-pdf?sheet=${s}`,
      "_blank"
    );
  };

  const exportCSV = () => {
    const s = normalizeSheet(sheet);
    if (!s) return alert("Enter sheet name");
   
    window.open(
      `${api.defaults.baseURL}/dq/export-excel?sheet=${s}`,
      "_blank"
    );
  };

  /* ================= UI ================= */

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Data Queue Reports
      </h1>

      <div style={row}>
        <input
          value={sheet}
          onChange={(e) => setSheet(e.target.value)}
          placeholder="Enter DQ Sheet name"
          style={input}
        />

        <button onClick={exportExcel} style={btnPrimary}>
          Download Excel
        </button>

        <button onClick={exportCSV} style={btnSecondary}>
          Download CSV
        </button>

        <button onClick={exportPDF} style={btnSecondary}>
          Download PDF
        </button>
      </div>
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const row = {
  display: "flex",
  gap: 10,
  marginTop: 12,
  flexWrap: "wrap",
};

const input = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  minWidth: 220,
};

const btnPrimary = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const btnSecondary = {
  padding: "8px 14px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};
