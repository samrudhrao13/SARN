import React, { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient"; 

export default function DQUpload() {
  const [sheet, setSheet] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitUpload(e) {
    e.preventDefault();
    setStatus("");

    if (!sheet.trim()) {
      setStatus("⚠️ Sheet name required");
      return;
    }

    if (!file) {
      setStatus("⚠️ Please select an Excel file");
      return;
    }

    setLoading(true);

    const fd = new FormData();
    fd.append("sheet", sheet.trim());
    fd.append("file", file);

    try {
      const res = await api.post("/dq/upload", fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const json = res.data;

      if (!json.ok) {
        setStatus("❌ Upload failed: " + (json.error || "Unknown error"));
      } else {
        setStatus(`✅ Uploaded ${json.added} DQ records successfully`);
        setFile(null);
        setSheet("");
      }
    } catch (err) {
      console.error("DQ UPLOAD ERROR:", err);
      setStatus("❌ Server error during upload");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Upload DQ Excel
      </h1>

      <form onSubmit={submitUpload} style={{ marginTop: 20 }}>
        <div style={row}>
          <input
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            placeholder="DQ Sheet name (e.g. DQ_MASTER_JAN)"
            style={input}
          />

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />

          <button type="submit" style={button} disabled={loading}>
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>

      {status && (
        <div
          style={{
            marginTop: 12,
            fontWeight: 600,
            color: status.startsWith("❌") ? "#dc2626" : "#16a34a",
          }}
        >
          {status}
        </div>
      )}
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const row = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const input = {
  padding: 10,
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  width: 300,
};

const button = {
  padding: "10px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};
