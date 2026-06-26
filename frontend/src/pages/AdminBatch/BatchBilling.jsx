import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function BatchBilling() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);

  const admin = JSON.parse(localStorage.getItem("sarnUser")) || {};

  useEffect(() => { loadSheets(); }, []);

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");
      if (res.data.ok) setSheets(res.data.sheets || []);
    } catch (err) { console.error(err); }
  }

  async function loadBillingQueue() {
    try {
      setLoading(true);
      const res = await api.get("/admin/batch/billing", { params: { sheet } });
      if (res.data.ok) setRows(res.data.rows || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (sheet) { loadBillingQueue(); setPage(1); setSearch(""); }
  }, [sheet]);

  function reset() {
    setSheet("");
    setRows([]);
    setSearch("");
    setPage(1);
    setMsg("");
  }

  async function markComplete(recordId) {
    try {
      const ok = window.confirm(`Mark ${recordId} as billed?`);
      if (!ok) return;
      setMsg("Updating...");
      const res = await api.post("/batch/workflow/billing", {
        sheet, recordId, adminId: admin.userId,
      });
      if (res.data.ok) {
        setMsg("Billing completed");
        loadBillingQueue();
      }
    } catch (err) {
      console.error(err);
      setMsg("Failed");
    }
  }

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const repo = String(r.common?.newRepository || r.recordId || "").toLowerCase();
    const chem = String(r.common?.chemicalName || "").toLowerCase();
    return repo.includes(q) || chem.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows  = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate("/admin/batch/dashboard")} style={backBtn}>← Back</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Batch Billing</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>Records pending billing approval</p>
        </div>
      </div>

      {/* Controls */}
      <div style={controlsBar}>
        <select
          value={sheet}
          onChange={(e) => setSheet(e.target.value)}
          style={sel}
        >
          <option value="">Select Sheet</option>
          {sheets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          type="text"
          placeholder="Search repo no. or chemical..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ ...sel, minWidth: 240 }}
          disabled={rows.length === 0}
        />

        <button onClick={reset} style={resetBtn}>↺ Reset</button>
      </div>

      {msg && <div style={{ marginBottom: 12, color: "#2563eb", fontWeight: 600 }}>{msg}</div>}

      {/* Stats */}
      {rows.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${rows.length} records`} color="blue" />
          {search.trim() && <Chip label={`Filtered: ${filteredRows.length} records`} color="green" />}
          <Chip label={`Page ${page} of ${totalPages}`} color="gray" />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : pagedRows.length === 0 ? (
          <Empty>{rows.length === 0 ? "Select a sheet to view billing records" : "No records match the search."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  {["SL No", "Repository No", "Chemical Name", "Manufacturer", "Site Name", "Verified By", "Date Verified", "Action"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row, i) => (
                  <tr key={row.recordId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={td}><b style={{ color: "#0f172a" }}>{row.common?.newRepository || row.recordId}</b></td>
                    <td style={{ ...td, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.common?.chemicalName}>{row.common?.chemicalName || "-"}</td>
                    <td style={{ ...td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.common?.manufacturerName}>{row.common?.manufacturerName || "-"}</td>
                    <td style={{ ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.common?.siteName}>{row.common?.siteName || "-"}</td>
                    <td style={td}>{row.verification?.verifiedBy || "-"}</td>
                    <td style={td}>{row.verification?.dateVerified || "-"}</td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => markComplete(row.recordId)}
                        style={{ padding: "6px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 12 }}
                      >
                        Mark Billed
                      </button>
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

function Empty({ children }) {
  return <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>{children}</div>;
}

const backBtn     = { padding: "7px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13 };
const controlsBar = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 14 };
const resetBtn    = { padding: "8px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const statsBar    = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto", height: "calc(100vh - 210px)" };
const th          = { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" };
const td          = { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", fontSize: 13 };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
