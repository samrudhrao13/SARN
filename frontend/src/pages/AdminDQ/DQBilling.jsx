import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function DQBilling() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState(() => localStorage.getItem("sarn_admin_dq_bill_sheet") || "");
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState(() => localStorage.getItem("sarn_admin_dq_bill_filter") || "ALL");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/dq/sheets").then((res) => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  useEffect(() => {
    if (sheet) loadBilling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBilling = async () => {
    if (!sheet) { setMsg("Please select a DQ sheet"); return; }
    setLoading(true);
    setMsg("");
    setRows([]);
    setPage(1);
    try {
      const res = await api.get("/dq/billing", { params: { sheet } });
      if (res.data.ok) {
        setRows(res.data.rows || []);
      } else {
        setMsg("Failed to load billing data");
      }
    } catch {
      setMsg("Server error");
    } finally {
      setLoading(false);
    }
  };

  function reset() {
    setSheet(""); setRows([]); setFilter("ALL"); setPage(1); setMsg("");
    localStorage.removeItem("sarn_admin_dq_bill_sheet");
    localStorage.removeItem("sarn_admin_dq_bill_filter");
  }

  const filteredRows = rows.filter((r) => {
    if (filter === "READY") return r.billingReady === true;
    if (filter === "NOT_READY") return r.billingReady !== true;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows  = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportExcel = () => {
    if (!sheet) return;
    window.open(`${api.defaults.baseURL}/dq/export?sheet=${sheet}&filter=${filter}`, "_blank");
  };

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate("/admin/dq/dashboard")} style={backBtn}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>DQ Billing – Workflow Summary</h1>
      </div>

      {/* Controls */}
      <div style={controlsBar}>
        <select value={sheet} onChange={(e) => { setSheet(e.target.value); localStorage.setItem("sarn_admin_dq_bill_sheet", e.target.value); }} style={sel}>
          <option value="">Select DQ Sheet</option>
          {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={loadBilling} style={primaryBtn}>Load</button>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); localStorage.setItem("sarn_admin_dq_bill_filter", e.target.value); setPage(1); }} style={sel}>
          <option value="ALL">All</option>
          <option value="READY">Billing Ready</option>
          <option value="NOT_READY">Not Ready</option>
        </select>
        <button onClick={exportExcel} style={exportBtn}>Export Excel</button>
        <button onClick={reset} style={resetBtn}>↺ Reset</button>
      </div>

      {msg && <p style={{ color: "#dc2626", marginBottom: 10, fontWeight: 600 }}>{msg}</p>}

      {/* Stats */}
      {rows.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${rows.length} records`} color="blue" />
          <Chip label={`Filtered: ${filteredRows.length} records`} color={filter !== "ALL" ? "green" : "gray"} />
          <Chip label={`Page ${page} of ${totalPages}`} color="gray" />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : pagedRows.length === 0 ? (
          <Empty>{rows.length === 0 ? "Select a sheet and click Load" : "No records match the selected filter."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  {["SL No", "Repo ID", "Chemical Product", "Manufacturer", "Billing Status", "View"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, i) => (
                  <tr key={r.repoId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={td}>{r.repoId}</td>
                    <td style={td}>{r.chemicalProduct || "-"}</td>
                    <td style={td}>{r.manufacturer || "-"}</td>
                    <td style={td}>
                      <Badge text={r.billingReady ? "READY" : "NOT READY"} color={r.billingReady ? "#16a34a" : "#f59e0b"} />
                    </td>
                    <td style={td}>
                      <button style={viewBtn} onClick={() => navigate(`/admin/dq/view/${r.repoId}?sheet=${sheet}`)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalPages}</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Chip({ label, color }) {
  const styles = {
    blue:  { bg: "#dbeafe", fg: "#1d4ed8" },
    green: { bg: "#dcfce7", fg: "#166534" },
    gray:  { bg: "#f1f5f9", fg: "#475569" },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: color + "22", color }}>
      {text}
    </span>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{children}</div>;
}

const backBtn     = { padding: "7px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13 };
const controlsBar = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 14 };
const primaryBtn  = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const exportBtn   = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const resetBtn    = { padding: "8px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const statsBar    = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto" };
const th          = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 12 };
const td          = { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
const viewBtn     = { padding: "5px 12px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
