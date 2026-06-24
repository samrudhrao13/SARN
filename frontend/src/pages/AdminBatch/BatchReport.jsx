import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all",   label: "All Time" },
];

const PERIOD_LABEL = { today: "Today", week: "This Week", month: "This Month", all: "All Time" };

export default function BatchReport() {
  const [period, setPeriod]             = useState("week");
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [userFilter, setUserFilter]     = useState("");

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get("/admin/batch/reports-data", { params: { period } });
      if (res.data.ok) { setData(res.data); setExpandedRows(new Set()); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function toggleRow(key) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function dlTeamPDF() {
    window.open(`${api.defaults.baseURL}/admin/report/pdf?period=${period}`, "_blank");
  }

  function dlUserPDF(uid) {
    window.open(`${api.defaults.baseURL}/admin/report/user-detail?userId=${uid}&period=${period}`, "_blank");
  }

  const allRows  = data?.rows  || [];
  const allUsers = data?.users || [];
  const filtered = userFilter ? allRows.filter(r => r.userId === userFilter) : allRows;
  const t        = data?.totals || {};
  const uniqueUserCount = new Set(filtered.map(r => r.userId)).size;

  // Totals derived from filtered rows
  const filtTotals = filtered.reduce((acc, r) => {
    acc.assigned         += r.assigned         || 0;
    acc.allTimeCompleted += r.allTimeCompleted  || 0;
    acc.completed        += r.completed         || 0;
    return acc;
  }, { assigned: 0, allTimeCompleted: 0, completed: 0 });
  const filtPrev    = Math.max(0, filtTotals.allTimeCompleted - filtTotals.completed);
  const filtPending = Math.max(0, filtTotals.assigned - filtTotals.allTimeCompleted);
  const filtPct     = filtTotals.assigned ? Math.round((filtTotals.allTimeCompleted / filtTotals.assigned) * 100) : 0;

  const periodLabel = PERIOD_LABEL[period] || period;

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Batch Monitoring Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>User × Business — one row per sheet</p>
        </div>
        <button onClick={dlTeamPDF} style={btnPrimary}>⬇ Download Team PDF</button>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={periodBtn(period === p.key)}>
            {p.label}
          </button>
        ))}
        <select
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", minWidth: 200, marginLeft: "auto" }}
        >
          <option value="">All Users</option>
          {allUsers.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Assigned"               value={t.totalAssigned}                                               color="#3b82f6" bg="#eff6ff" />
          <StatCard label="All-Time Completed"           value={t.allTimeCompleted}                                            color="#16a34a" bg="#f0fdf4" />
          <StatCard label={`Completed (${periodLabel})`} value={t.totalCompleted}                                              color="#0891b2" bg="#ecfeff" />
          <StatCard label="Total Pending"                value={Math.max(0,(t.totalAssigned||0)-(t.allTimeCompleted||0))}     color="#f59e0b" bg="#fef3c7" />
          <StatCard label="Active Users"                 value={uniqueUserCount}                                               color="#8b5cf6" bg="#ede9fe" />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <th style={th}>User</th>
                <th style={th}>Business (Sheet)</th>
                <th style={{ ...th, textAlign: "center" }}>Assigned</th>
                <th style={{ ...th, textAlign: "center" }}>Prev. Completed</th>
                <th style={{ ...th, textAlign: "center" }}>Completed ({periodLabel})</th>
                <th style={{ ...th, textAlign: "center" }}>Total Pending</th>
                <th style={{ ...th, textAlign: "center" }}>% Done</th>
                <th style={{ ...th, textAlign: "center" }}>PDF</th>
              </tr>
            </thead>
            <tbody>
              {/* Totals row */}
              {data && filtered.length > 0 && (
                <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                  <td style={{ padding: "8px 12px" }} colSpan={2}>
                    TOTAL ({uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}, {filtered.length} row{filtered.length !== 1 ? "s" : ""})
                  </td>
                  <td style={{ textAlign: "center", padding: 8 }}>{filtTotals.assigned}</td>
                  <td style={{ textAlign: "center", padding: 8, color: "#93c5fd" }}>{filtPrev}</td>
                  <td style={{ textAlign: "center", padding: 8, color: "#86efac" }}>{filtTotals.completed}</td>
                  <td style={{ textAlign: "center", padding: 8, color: "#fca5a5" }}>{filtPending}</td>
                  <td style={{ textAlign: "center", padding: 8 }}>{filtPct}%</td>
                  <td />
                </tr>
              )}

              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No data available
                </td></tr>
              )}

              {filtered.map((row, i) => {
                const key                = `${row.userId}|||${row.sheetId}`;
                const prevCompleted      = Math.max(0, (row.allTimeCompleted || 0) - (row.completed || 0));
                const totalPending       = Math.max(0, (row.assigned || 0) - (row.allTimeCompleted || 0));
                const pct                = row.assigned ? Math.round(((row.allTimeCompleted || 0) / row.assigned) * 100) : 0;
                const sheetLabel         = (row.sheetId || "").replace(/_/g, " ");

                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => toggleRow(key)}
                      style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}
                    >
                      <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                        <span style={{ marginRight: 6, fontSize: 10, color: "#94a3b8" }}>
                          {expandedRows.has(key) ? "▼" : "▶"}
                        </span>
                        {row.name}
                      </td>
                      <td style={{ padding: "9px 12px" }}>
                        <span style={sheetBadge}>{sheetLabel}</span>
                      </td>
                      <td style={{ textAlign: "center", padding: 9, fontWeight: 700 }}>{row.assigned}</td>
                      <td style={{ textAlign: "center", padding: 9, color: "#2563eb", fontWeight: 600 }}>{prevCompleted}</td>
                      <td style={{ textAlign: "center", padding: 9, color: "#16a34a", fontWeight: 600 }}>{row.completed || 0}</td>
                      <td style={{ textAlign: "center", padding: 9, color: totalPending > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>
                        {totalPending}
                      </td>
                      <td style={{ textAlign: "center", padding: 9 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 60, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "6px 10px" }}>
                        <button
                          onClick={e => { e.stopPropagation(); dlUserPDF(row.userId); }}
                          style={btnSmall}
                        >
                          PDF
                        </button>
                      </td>
                    </tr>

                    {expandedRows.has(key) && (
                      <tr>
                        <td colSpan={8} style={{ background: "#f1f5f9", padding: "0 16px 16px 32px" }}>
                          <div style={{ marginTop: 12 }}>
                            <strong style={{ fontSize: 13, color: "#0f172a" }}>
                              Completed ({periodLabel}) — {row.name} / {sheetLabel} ({row.records?.length || 0})
                            </strong>
                            <div style={{ overflow: "auto", marginTop: 8 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
                                <thead>
                                  <tr style={{ background: "#0f172a", color: "#fff" }}>
                                    {["Repository No", "Chemical Name", "Language", "Completed At"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.records || []).length === 0 && (
                                    <tr><td colSpan={4} style={{ padding: 10, color: "#94a3b8", textAlign: "center" }}>
                                      No records completed in this period
                                    </td></tr>
                                  )}
                                  {(row.records || []).map((r, j) => (
                                    <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                      <td style={subTd}>{r.repositoryNo || "—"}</td>
                                      <td style={{ ...subTd, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.chemical || "—"}</td>
                                      <td style={subTd}>
                                        <span style={langBadge(r.language)}>{r.language || "—"}</span>
                                      </td>
                                      <td style={subTd}>
                                        {r.completedAt
                                          ? new Date(r.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                                          : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 8, padding: "12px 16px" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function langBadge(lang) {
  const ml = lang && lang.toLowerCase() !== "english";
  return {
    display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: ml ? "#ede9fe" : "#dbeafe", color: ml ? "#7c3aed" : "#1d4ed8",
  };
}

const th         = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 12 };
const subTd      = { padding: "6px 10px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const sheetBadge = { display: "inline-block", background: "#e2e8f0", color: "#334155", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 };
const btnPrimary = { padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 };
const btnSmall   = { padding: "4px 10px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" };
const periodBtn  = (active) => ({ padding: "7px 14px", borderRadius: 6, border: "none", background: active ? "#2563eb" : "#e2e8f0", color: active ? "#fff" : "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13 });
