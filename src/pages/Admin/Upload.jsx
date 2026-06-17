import React, { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";


const normalize = (s) =>
  String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

export default function Upload() {
  const [sheet, setSheet] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [fileKey, setFileKey] = useState(Date.now());

  const handleUpload = async () => {
    if (!sheet.trim()) {
      setStatus("⚠️ Sheet name required");
      return;
    }

    if (!file) {
      setStatus("⚠️ Please select an Excel file");
      return;
    }

    setLoading(true);
    setStatus("");

    const fd = new FormData();
    fd.append("sheet", normalize(sheet));
    fd.append("file", file);

    try {
      const res = await api.post("/sds/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data;

      if (!data.ok) {
        setStatus(`❌ Upload failed: ${data.error || "Unknown error"}`);
      } else if (data.count === 0) {
        setStatus(
          "⚠️ Upload completed but 0 references detected. Check Excel column: 'Repository Number'."
        );
      } else {
        setStatus(`✅ Uploaded ${data.count} SDS references successfully`);
        setFile(null);
        setFileKey(Date.now());
      }
    } catch (err) {
      console.error("SDS UPLOAD ERROR:", err);
      setStatus("❌ Server error while uploading");
    }

    setLoading(false);
  };

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 20 }}>Upload SDS Excel</h1>

      <div
        style={{
          background: "#fff",
          padding: 25,
          borderRadius: 10,
          maxWidth: 500,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <label style={label}>SDS Sheet Name</label>
        <input
          style={input}
          placeholder="e.g. MASTER_SDS_JAN"
          value={sheet}
          onChange={(e) => setSheet(e.target.value)}
        />

        <label style={label}>Excel File</label>
        <input
          key={fileKey}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files[0] || null)}
          style={{ marginBottom: 15 }}
        />

        <button style={button} onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload SDS Excel"}
        </button>

        {status && (
          <p
            style={{
              marginTop: 15,
              fontWeight: "bold",
              color: status.startsWith("❌")
                ? "red"
                : status.startsWith("⚠️")
                ? "#ca8a04"
                : "green",
            }}
          >
            {status}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}

/* STYLES */
const label = {
  display: "block",
  marginBottom: 6,
  fontWeight: "bold",
};

const input = {
  width: "100%",
  padding: "8px 10px",
  marginBottom: 15,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const button = {
  padding: "10px 16px",
  width: "100%",
  background: "#1d4ed8",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 16,
};
