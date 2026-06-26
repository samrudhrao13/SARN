import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;
const fix = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

export default function References() {
  const navigate = useNavigate();
  const [company] = useState("SARN");

  const [sheets, setSheets]       = useState([]);
  const [sheet, setSheet]         = useState("");
  const [rows, setRows]           = useState([]);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showChart, setShowChart] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    api.get("/sds/sheets").then((res) => {
      if (res.data.ok && Array.isArray(res.data.sheets)) setSheets(res.data.sheets);
    });
  }, []);

  async function loadReferences(selectedSheet, p = 1) {
    if (!selectedSheet) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/sds/list", {
        params: { sheet: fix(selectedSheet), page: p, pageSize: PAGE_SIZE },
      });
      if (!res.data.ok) {
        setRows([]); setTotal(0);
        setError(res.data.error || "Failed to load references");
      } else {
        setRows(res.data.rows || []);
        setTotal(res.data.total || 0);
        setPage(p);
      }
    } catch {
      setError("Backend connection failed");
    }
    setLoading(false);
  }

  async function loadProductivity() {
    if (!sheet || !fromDate || !toDate) {
      alert("Select Sheet, From Date and To Date");
      return;
    }
    try {
      const res = await api.get("/admin/workflow/productivity", {
        params: { sheet: fix(sheet), fromDate, toDate },
      });
      if (res.data.ok) setStats(res.data);
    } catch {
      alert("Failed to load report");
    }
  }

  function getWorkflowStatus(ref) {
    const s  = ref.search?.status || "pending";
    const sp = ref.supersede?.status || "waiting";
    const t  = ref.transcription?.status || "waiting";
    const b  = ref.billing?.status || "waiting";
    if (s === "pending")                          return { text: "Not Started",           color: "#94a3b8", bg: "#f1f5f9" };
    if (s === "completed" && sp === "waiting")    return { text: "Awaiting Supersede",    color: "#92400e", bg: "#fef3c7" };
    if (sp === "completed" && t === "waiting")    return { text: "Awaiting Transcription",color: "#3730a3", bg: "#e0e7ff" };
    if (t === "completed" && b === "waiting")     return { text: "Awaiting Billing",      color: "#991b1b", bg: "#fee2e2" };
    if (b === "completed")                        return { text: "Completed",              color: "#166534", bg: "#dcfce7" };
    return { text: "In Progress", color: "#1d4ed8", bg: "#dbeafe" };
  }

  function openDetails(refId) {
    navigate("/admin/workflow-details", {
      state: { referenceId: refId, company, sheet: fix(sheet) },
    });
  }

  return (
    <>
      <h2 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        SDS Reference List
      </h2>

      {/* ── Control Card ── */}
      <div style={controlCard}>
        <div style={dropRow}>

          <DropGroup label="SDS Sheet">
            <select
              value={sheet}
              onChange={(e) => { setSheet(e.target.value); loadReferences(e.target.value, 1); setStats(null); setShowChart(false); }}
              style={dropSel}
            >
              <option value="">-- Select Sheet --</option>
              {sheets.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="From Date">
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dropSel} />
          </DropGroup>

          <DropGroup label="To Date">
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dropSel} />
          </DropGroup>

          <div style={{ display: "flex", flexDirection: "column", gap: 4, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", visibility: "hidden" }}>
              &nbsp;
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={loadProductivity} style={primaryBtn}>Load Report</button>
              <button
                onClick={() => {
                  if (!stats) { alert("Load Report first"); return; }
                  setShowChart(p => !p);
                }}
                style={secondaryBtn}
              >
                {showChart ? "Hide Chart" : "Performance Report"}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* ── Productivity Summary ── */}
      {stats && (
        <div style={statsBar}>
          <Chip label={`Total Records: ${stats.summary.totalRecords}`}    color="blue"   />
          <Chip label={`Assigned: ${stats.summary.assignedRecords}`}      color="purple" />
          <Chip label={`Completed: ${stats.summary.completedRecords}`}    color="green"  />
          <Chip label={`Head Count: ${stats.summary.headCount}`}          color="gray"   />
        </div>
      )}

      {error && <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: 10 }}>{error}</p>}

      {/* ── User Productivity Table ── */}
      {stats?.users?.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>User Productivity</h3>
          <div style={{ ...tableWrap, maxHeight: "none" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff" }}>
                  {["User", "Assigned", "Completed", "Pending", "Completion %"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.users.map((u, i) => {
                  const pct = u.assigned ? ((u.completed / u.assigned) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={u.userId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                      <td style={{ ...td, fontWeight: 600 }}>{u.userId}</td>
                      <td style={td}>{u.assigned}</td>
                      <td style={td}>{u.completed}</td>
                      <td style={td}>{u.pending}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, minWidth: 40 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pie Chart ── */}
      {showChart && stats && <PieChart users={stats.users} />}

      {/* ── References Stats ── */}
      {total > 0 && (
        <div style={{ ...statsBar, marginTop: 4 }}>
          <Chip label={`Total: ${total} references`} color="blue" />
          <Chip label={`Page ${page} of ${totalPages}`}           color="gray" />
        </div>
      )}

      {/* ── References Table ── */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading...</Empty>
        ) : rows.length === 0 ? (
          <Empty>{sheet ? "No references found for this sheet." : "Select a sheet above to load references."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  {["SL No", "Reference ID", "Chemical Product", "Manufacturer Name", "Workflow Status"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((ref, i) => {
                  const status = getWorkflowStatus(ref);
                  const refId  = ref.referenceId || ref.refId;
                  return (
                    <tr
                      key={`${sheet}-${refId}`}
                      onClick={() => openDetails(refId)}
                      style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#f8fafc" : "#fff"}
                    >
                      <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center", width: 50 }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>{refId}</td>
                      <td style={td}>{ref.common?.chemicalProduct || "-"}</td>
                      <td style={td}>{ref.common?.manufacturerName || "-"}</td>
                      <td style={td}>
                        <span style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 4,
                          fontSize: 11, fontWeight: 700, background: status.bg, color: status.color,
                        }}>
                          {status.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1}          onClick={() => loadReferences(sheet, page - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalPages} &nbsp;·&nbsp; {total} records</span>
                <button disabled={page === totalPages} onClick={() => loadReferences(sheet, page + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ── Subcomponents ── */

function DropGroup({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 180px", minWidth: 0, maxWidth: 280 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ label, color }) {
  const map = {
    blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
    green:  { bg: "#dcfce7", fg: "#166534" },
    purple: { bg: "#ede9fe", fg: "#7c3aed" },
    gray:   { bg: "#f1f5f9", fg: "#475569" },
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

/* ── Pie Chart ── */
const COLORS = ["#2563eb","#16a34a","#dc2626","#f59e0b","#7c3aed","#0891b2","#db2777","#65a30d"];

function PieChart({ users }) {
  const data = users.filter(u => u.completed > 0);
  if (data.length === 0) return <p style={{ color: "#64748b" }}>No completed records to chart.</p>;
  const tot = data.reduce((s, u) => s + u.completed, 0);
  const cx = 160, cy = 160, r = 130;
  let angle = -Math.PI / 2;
  const slices = data.map((u, i) => {
    const sweep = (u.completed / tot) * 2 * Math.PI;
    const end = angle + sweep;
    const path = `M${cx} ${cy} L${cx + r * Math.cos(angle)} ${cy + r * Math.sin(angle)} A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${cx + r * Math.cos(end)} ${cy + r * Math.sin(end)}Z`;
    const mid = angle + sweep / 2;
    const lx = cx + r * 0.65 * Math.cos(mid), ly = cy + r * 0.65 * Math.sin(mid);
    const pct = ((u.completed / tot) * 100).toFixed(1);
    angle = end;
    return { path, lx, ly, color: COLORS[i % COLORS.length], u, pct };
  });
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Performance Report — Completed Work per User</h3>
      <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
        <svg width={320} height={320}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} />
              {parseFloat(s.pct) > 5 && (
                <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill="#fff">{s.pct}%</text>
              )}
            </g>
          ))}
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}><b>{s.u.userId}</b> — {s.u.completed} completed ({s.pct}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const controlCard  = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const dropRow      = { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" };
const dropSel      = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, width: "100%", boxSizing: "border-box" };
const primaryBtn   = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const secondaryBtn = { padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const statsBar     = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap    = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 420px)" };
const th           = { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td           = { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const pageBar      = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn        = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
