import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

export default function DQBilling() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("READY"); 
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* ================= LOAD DQ SHEETS ================= */
  useEffect(() => {
    api.get("/dq/sheets").then((res) => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ================= LOAD BILLING DATA ================= */
  const loadBilling = async () => {
    if (!sheet) {
      setMsg("❌ Please select a DQ sheet");
      return;
    }

    setLoading(true);
    setMsg("");
    setRows([]);

    try {
      const res = await api.get("/dq/billing", {
        params: { sheet },
      });

      if (res.data.ok) {
        setRows(res.data.rows || []);
      } else {
        setMsg("❌ Failed to load billing data");
      }
    } catch {
      setMsg("❌ Server error");
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTERED ROWS ================= */
  const filteredRows = rows.filter((r) => {
    if (filter === "READY") return r.billingReady === true;
    if (filter === "NOT_READY") return r.billingReady !== true;
    return true;
  });

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    if (!sheet) return;

    const base = api.defaults.baseURL;
    window.open(
      `${base}/dq/export?sheet=${sheet}&filter=${filter}`,
      "_blank"
    );
  };

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 12 }}>DQ Billing – Workflow Summary</h1>

      {/* ================= CONTROLS ================= */}
      <div style={controls}>
        <select
          value={sheet}
          onChange={(e) => setSheet(e.target.value)}
          style={select}
        >
          <option value="">Select DQ Sheet</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button onClick={loadBilling} style={loadBtn}>
          Load
        </button>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={select}
        >
          <option value="READY">Billing Ready</option>
          <option value="NOT_READY">Not Ready</option>
        </select>

        <button onClick={exportExcel} style={exportBtn}>
          Export Excel
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {msg && <p>{msg}</p>}
      {!loading && (
        <p style={{ marginBottom: 10 }}>
          Showing <b>{filteredRows.length}</b> records
        </p>
      )}

      {/* ================= TABLE ================= */}
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>SL No</th>
            <th style={th}>Repo ID</th>
            <th style={th}>Chemical Product</th>
            <th style={th}>Manufacturer</th>
            <th style={th}>Billing Status</th>
            <th style={th}>View</th>
          </tr>
        </thead>

        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan="6" style={empty}>
                No records found
              </td>
            </tr>
          ) : (
            filteredRows.map((r, i) => (
              <tr key={r.repoId}>
                <td style={tdCenter}>{i + 1}</td>
                <td style={tdCenter}>{r.repoId}</td>
                <td style={td}>{r.chemicalProduct || "-"}</td>
                <td style={td}>{r.manufacturer || "-"}</td>
                <td style={tdCenter}>
                  <span
                    style={{
                      ...badge,
                      background: r.billingReady ? "#DCFCE7" : "#FEF3C7",
                      color: r.billingReady ? "#166534" : "#92400E",
                    }}
                  >
                    {r.billingReady ? "READY" : "NOT READY"}
                  </span>
                </td>
                <td style={tdCenter}>
                  <button
                    style={viewBtn}
                    onClick={() =>
                      navigate(`/admin/dq/view/${r.repoId}?sheet=${sheet}`)
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const controls = {
  display: "flex",
  gap: 10,
  marginBottom: 14,
  alignItems: "center",
};

const select = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
};

const loadBtn = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
};

const exportBtn = {
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "#16a34a",
  color: "#fff",
  cursor: "pointer",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #111",
  fontSize: 14,
};

const th = {
  border: "1px solid #111",
  padding: "8px",
  background: "#f9fafb",
  textAlign: "center",
  fontWeight: 600,
};

const td = {
  border: "1px solid #111",
  padding: "8px",
};

const tdCenter = {
  ...td,
  textAlign: "center",
};

const badge = {
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
};

const viewBtn = {
  background: "#111827",
  color: "#fff",
  border: "none",
  padding: "6px 14px",
  borderRadius: 6,
  cursor: "pointer",
};

const empty = {
  textAlign: "center",
  padding: 20,
};
