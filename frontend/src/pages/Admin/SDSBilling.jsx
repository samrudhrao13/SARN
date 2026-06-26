import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function SDSBilling() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState(() => localStorage.getItem("sarn_admin_sds_bill_sheet") || "");
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState(() => localStorage.getItem("sarn_admin_sds_bill_filter") || "ALL");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const normalize = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

  const totalServerPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    api.get("/sds/sheets").then((res) => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  useEffect(() => {
    if (sheet) loadBilling(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBilling(p = 1) {
    if (!sheet) { alert("Select SDS Sheet"); return; }
    setLoading(true);
    setRows([]);
    try {
      const res = await api.get("/sds/list", {
        params: { sheet: normalize(sheet), page: p, pageSize: PAGE_SIZE },
      });
      if (!res.data.ok) { alert("Failed to load billing data"); return; }
      const mapped = (res.data.rows || []).map((r) => ({
        referenceId: r.referenceId,
        lastWorkedBy: r.transcription?.user || r.supersede?.user || r.search?.user || "-",
        billingReady: r.billing?.status === "ready",
        notPublishable: r.search?.notPublishable === true,
      }));
      setRows(mapped);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch (err) {
      console.error(err);
      alert("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSheet(""); setRows([]); setFilter("ALL"); setPage(1); setTotal(0);
    localStorage.removeItem("sarn_admin_sds_bill_sheet");
    localStorage.removeItem("sarn_admin_sds_bill_filter");
  }

  const filteredRows = rows.filter((r) => {
    if (filter === "READY") return r.billingReady;
    if (filter === "PENDING") return !r.billingReady;
    return true;
  });

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigate("/admin/dashboard")} style={backBtn}>← Back</button>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>SDS Billing – Workflow Summary</h1>
      </div>

      {/* Controls */}
      <div style={controlsBar}>
        <select value={sheet} onChange={(e) => { setSheet(e.target.value); localStorage.setItem("sarn_admin_sds_bill_sheet", e.target.value); }} style={sel}>
          <option value="">Select SDS Sheet</option>
          {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => loadBilling(1)} style={primaryBtn}>Load</button>
        <select value={filter} onChange={(e) => { setFilter(e.target.value); localStorage.setItem("sarn_admin_sds_bill_filter", e.target.value); }} style={sel}>
          <option value="ALL">All</option>
          <option value="READY">Ready for Billing</option>
          <option value="PENDING">Yet to Complete</option>
        </select>
        <button onClick={reset} style={resetBtn}>↺ Reset</button>
      </div>

      {/* Stats */}
      {rows.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${total} records`} color="blue" />
          <Chip label={`Filtered: ${filteredRows.length} on this page`} color={filter !== "ALL" ? "green" : "gray"} />
          <Chip label={`Page ${page} of ${totalServerPages}`} color="gray" />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading…</Empty>
        ) : filteredRows.length === 0 ? (
          <Empty>{rows.length === 0 ? "Select a sheet and click Load" : "No records match the selected filter."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  {["SL No", "Reference ID", "Last Worked By", "Status", "Type", "View"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.referenceId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                    <td style={td}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={td}>{r.referenceId}</td>
                    <td style={td}>{r.lastWorkedBy}</td>
                    <td style={td}>
                      <Badge text={r.billingReady ? "READY" : "PENDING"} color={r.billingReady ? "#16a34a" : "#dc2626"} />
                    </td>
                    <td style={td}>
                      <Badge text={r.notPublishable ? "NOT PUBLISHABLE" : "PUBLISHABLE"} color={r.notPublishable ? "#9333ea" : "#64748b"} />
                    </td>
                    <td style={td}>
                      <button style={viewBtn} onClick={() => navigate(`/admin/workflow/view/${normalize(sheet)}/${r.referenceId}`)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalServerPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1} onClick={() => loadBilling(page - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalServerPages}</span>
                <button disabled={page === totalServerPages} onClick={() => loadBilling(page + 1)} style={pgBtn(page === totalServerPages)}>Next ▶</button>
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
const resetBtn    = { padding: "8px 18px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 14 };
const statsBar    = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto" };
const th          = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 12 };
const td          = { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13 };
const viewBtn     = { padding: "5px 12px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
