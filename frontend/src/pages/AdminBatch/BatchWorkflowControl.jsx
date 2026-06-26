import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;
const LS_SHEET  = "sarn_admin_batch_wf_sheet";
const LS_STATUS = "sarn_admin_batch_wf_status";

export default function BatchWorkflowControl() {
  const [sheets, setSheets]           = useState([]);
  const [sheet, setSheet]             = useState(() => localStorage.getItem(LS_SHEET) || "");
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem(LS_STATUS) || "ALL");
  const [rows, setRows]               = useState([]);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    api.get("/batch/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  useEffect(() => {
    if (sheet) loadRecords();
  }, [sheet]);

  async function loadRecords() {
    if (!sheet) return;
    setLoading(true);
    try {
      const res = await api.get("/admin/batch/list", { params: { sheet } });
      if (res.data.ok) { setRows(res.data.rows || []); setPage(1); }
      else setRows([]);
    } catch (err) {
      console.error("BATCH WF LOAD:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = rows.filter(r => {
    if (statusFilter === "ALL") return true;
    return (r.status || "ASSIGN_PENDING") === statusFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows  = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Batch Workflow Control
      </h2>

      {/* ── Controls ── */}
      <div style={controlsBar}>
        <select
          value={sheet}
          onChange={e => {
            setSheet(e.target.value);
            localStorage.setItem(LS_SHEET, e.target.value);
          }}
          style={sel}
        >
          <option value="">-- Select Sheet --</option>
          {sheets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            localStorage.setItem(LS_STATUS, e.target.value);
            setPage(1);
          }}
          style={sel}
        >
          <option value="ALL">All Status</option>
          <option value="ASSIGN_PENDING">Assign Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* ── Stats ── */}
      {rows.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${rows.length} records`}       color="blue"  />
          <Chip label={`Filtered: ${filteredRows.length}`}    color="green" />
          <Chip label={`Page ${page} of ${totalPages}`}       color="gray"  />
        </div>
      )}

      {/* ── Table ── */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading…</Empty>
        ) : pagedRows.length === 0 ? (
          <Empty>{sheet ? "No records found for this sheet." : "Select a sheet above to load records."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  {["SL No", "Repository No", "Chemical Name", "Manufacturer", "Language", "Status"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((r, i) => (
                  <tr
                    key={r.recordId}
                    style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#f8fafc" : "#fff"}
                  >
                    <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center", width: 50 }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>{r.newRepository || r.recordId}</td>
                    <td style={td}>{r.chemicalName || "-"}</td>
                    <td style={td}>{r.manufacturerName || "-"}</td>
                    <td style={td}>{r.language || "-"}</td>
                    <td style={td}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalPages} &nbsp;·&nbsp; {filteredRows.length} records</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ── Sub-components ── */

function StatusBadge({ status }) {
  const map = {
    ASSIGN_PENDING: { bg: "#fef3c7", fg: "#92400e", text: "Assign Pending" },
    IN_PROGRESS:    { bg: "#dbeafe", fg: "#1d4ed8", text: "In Progress"    },
    COMPLETED:      { bg: "#dcfce7", fg: "#166534", text: "Completed"       },
  };
  const s = map[status] || { bg: "#f1f5f9", fg: "#475569", text: status || "Unknown" };
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg }}>
      {s.text}
    </span>
  );
}

function Chip({ label, color }) {
  const map = {
    blue:  { bg: "#dbeafe", fg: "#1d4ed8" },
    green: { bg: "#dcfce7", fg: "#166534" },
    gray:  { bg: "#f1f5f9", fg: "#475569" },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>{children}</div>;
}

/* ── Styles ── */
const controlsBar = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 14, minWidth: 180 };
const statsBar    = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto", height: "calc(100vh - 210px)" };
const th          = { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td          = { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
