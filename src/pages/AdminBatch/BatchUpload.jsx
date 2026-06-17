import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

export default function BatchUpload() {
  const [sheet, setSheet] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [sheets, setSheets] = useState([]);

  useEffect(() => {
    loadSheets();
  }, []);

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");

      if (res.data.ok) {
        setSheets(res.data.sheets || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function uploadFile() {
    if (!sheet.trim()) {
      alert("Enter Sheet Name");
      return;
    }

    if (!file) {
      alert("Select Excel File");
      return;
    }

    try {
      setLoading(true);
      setMsg("Uploading...");

      const formData = new FormData();

      formData.append("sheet", sheet);
      formData.append("file", file);

      const res = await api.post(
        "/batch/upload",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      if (res.data.ok) {
        setMsg(
          `Upload Successful (${res.data.count} records)`
        );

        setFile(null);

        loadSheets();
      } else {
        setMsg(
          res.data.error ||
            "Upload Failed"
        );
      }
    } catch (err) {
      console.error(err);
      setMsg("Upload Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
      minHeight: "100vh",
    }}
  >
      <h2>Batch Upload</h2>

      {/* Upload Form */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 600,
          marginBottom: 30,
        }}
      >
        <input
          type="text"
          placeholder="Sheet Name (Example: APRIL_2025)"
          value={sheet}
          onChange={e =>
            setSheet(
              e.target.value.toUpperCase()
            )
          }
        />

        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={e =>
            setFile(
              e.target.files?.[0] || null
            )
          }
        />

        <button
          onClick={uploadFile}
          disabled={loading}
        >
          {loading
            ? "Uploading..."
            : "Upload Batch"}
        </button>

        {msg && (
          <div
            style={{
              padding: 10,
              background: "#f8fafc",
              border:
                "1px solid #cbd5e1",
            }}
          >
            {msg}
          </div>
        )}
      </div>

      {/* Existing Sheets */}

      <h3>Available Batch Sheets</h3>

      <table
        border="1"
        width="100%"
        cellPadding="8"
      >
        <thead>
          <tr
            style={{
              background: "#f1f5f9",
            }}
          >
            <th>#</th>
            <th>Sheet Name</th>
          </tr>
        </thead>

        <tbody>
          {sheets.map((s, idx) => (
            <tr key={s}>
              <td>{idx + 1}</td>
              <td>{s}</td>
            </tr>
          ))}

          {sheets.length === 0 && (
            <tr>
              <td
                colSpan="2"
                style={{
                  textAlign: "center",
                }}
              >
                No Batch Sheets
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Template Information */}

      <div
        style={{
          marginTop: 30,
          padding: 15,
          border:
            "1px solid #e2e8f0",
          borderRadius: 8,
        }}
      >
        <h4>Required Excel Columns</h4>

        <ul>
          <li>Chemical Name</li>
          <li>Manufacturer Name</li>
          <li>Revision Date</li>
          <li>Site Name</li>
          <li>Site SDS #</li>
          <li>Language</li>
          <li>New Repository</li>
          <li>Product Code</li>
          <li>Pdf File Name</li>
        </ul>
      </div>
    </div>
  );
}