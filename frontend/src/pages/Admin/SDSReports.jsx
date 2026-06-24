import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all",   label: "All Time" },
];

const PERIOD_LABEL = { today: "Today", week: "This Week", month: "This Month", all: "All Time" };

const STAGE_COLORS = {
  search:        { bg: "#eff6ff", text: "#1d4ed8" },
  supersede:     { bg: "#fefce8", text: "#b45309" },
  transcription: { bg: "#f0fdf4", text: "#15803d" },
  billing:       { bg: "#fdf4ff", text: "#7e22ce" },
};

export default function SDSReports() {
  const [period, setPeriod]             = useState("week");
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [userFilter, setUserFilter]     = useState("");

  useEffect(() => { loadData(); }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get("/admin/sds/reports-data", { params: { period } });
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

  function dlUserPDF(uid) {
    window.open(`${api.defaults.baseURL}/admin/report/user-detail?userId=${uid}&period=${period}`, "_blank");
  }

  function dlTeamPDF() {
    window.open(`${api.defaults.baseURL}/admin/report/pdf?period=${period}`, "_blank");
  }

  const allRows  = data?.rows  || [];
  const allUsers = data?.users || [];
  const filtered = userFilter ? allRows.filter(r => r.userId === userFilter) : allRows;
  const t        = data?.totals || {};
  const uniqueUserCount = new Set(filtered.map(r => r.userId)).size;
  const periodLabel = PERIOD_LABEL[period] || period;

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#f8fafc" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>SDS Monitoring Dashboard</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>User × Business — one row per sheet · search · supersede · transcription · billing</p>
        </div>
        <button onClick={dlTeamPDF} style={btnPrimary}>⬇ Download Team PDF</button>
      </div>

      {/* ── Controls ── */}
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

      {/* ── Summary Cards ── */}
      {data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 24 }}>
          <StatCard label="Total Assigned"               value={t.totalAssigned}                                             color="#3b82f6" bg="#eff6ff" />
          <StatCard label="All-Time Completed"           value={t.allTimeTotal}                                              color="#16a34a" bg="#f0fdf4" />
          <StatCard label={`Completed (${periodLabel})`} value={t.total}                                                     color="#0891b2" bg="#ecfeff" />
          <StatCard label="Total Pending"                value={Math.max(0,(t.totalAssigned||0)-(t.allTimeTotal||0))}       color="#f59e0b" bg="#fef3c7" />
          <StatCard label="Search (E)"                   value={t.searchE}                                                   color="#1d4ed8" bg="#dbeafe" />
          <StatCard label="Search (ML)"                  value={t.searchML}                                                  color="#7c3aed" bg="#ede9fe" />
          <StatCard label="Supersede (E)"                value={t.supersedeE}                                                color="#b45309" bg="#fef3c7" />
          <StatCard label="Supersede (ML)"               value={t.supersedeML}                                               color="#b45309" bg="#fde68a" />
          <StatCard label="Trans. (E)"                   value={t.transcriptionE}                                            color="#15803d" bg="#dcfce7" />
          <StatCard label="Trans. (ML)"                  value={t.transcriptionML}                                           color="#15803d" bg="#bbf7d0" />
          <StatCard label="Billing (E)"                  value={t.billingE}                                                  color="#7e22ce" bg="#fae8ff" />
          <StatCard label="Billing (ML)"                 value={t.billingML}                                                 color="#7e22ce" bg="#f5d0fe" />
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>Loading...</div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <Th>User</Th>
                <Th>Business (Sheet)</Th>
                <Th center>Assigned</Th>
                <Th center>Prev. Completed</Th>
                <Th center>Completed ({periodLabel})</Th>
                <Th center>Total Pending</Th>
                <Th center>Srch E</Th>
                <Th center>Srch ML</Th>
                <Th center>Supr E</Th>
                <Th center>Supr ML</Th>
                <Th center>Trans E</Th>
                <Th center>Trans ML</Th>
                <Th center>Bill E</Th>
                <Th center>Bill ML</Th>
                <Th center>PDF</Th>
              </tr>
            </thead>
            <tbody>
              {/* Totals row */}
              {data && filtered.length > 0 && (
                <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                  <td style={{ padding: "8px 12px" }} colSpan={2}>
                    TOTAL ({uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}, {filtered.length} row{filtered.length !== 1 ? "s" : ""})
                  </td>
                  <Num v={t.totalAssigned} />
                  <Num v={(t.allTimeTotal||0) - (t.total||0)} prev />
                  <Num v={t.total} bold />
                  <Num v={Math.max(0,(t.totalAssigned||0)-(t.allTimeTotal||0))} pending />
                  <Num v={t.searchE} />
                  <Num v={t.searchML} ml />
                  <Num v={t.supersedeE} />
                  <Num v={t.supersedeML} ml />
                  <Num v={t.transcriptionE} />
                  <Num v={t.transcriptionML} ml />
                  <Num v={t.billingE} />
                  <Num v={t.billingML} ml />
                  <td />
                </tr>
              )}

              {filtered.length === 0 && (
                <tr><td colSpan={15} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>
                  No data available
                </td></tr>
              )}

              {filtered.map((row, i) => {
                const key            = `${row.userId}|||${row.sheetId}`;
                const sheetLabel     = (row.sheetId || "").replace(/_/g, " ");
                const prevCompleted  = Math.max(0, (row.allTimeTotal || 0) - (row.total || 0));
                const totalPending   = Math.max(0, (row.totalAssigned || 0) - (row.allTimeTotal || 0));

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
                      <Num v={row.totalAssigned} />
                      <Num v={prevCompleted} prev />
                      <Num v={row.total} bold />
                      <Num v={totalPending} pending />
                      <Num v={row.searchE} />
                      <Num v={row.searchML} ml />
                      <Num v={row.supersedeE} />
                      <Num v={row.supersedeML} ml />
                      <Num v={row.transcriptionE} />
                      <Num v={row.transcriptionML} ml />
                      <Num v={row.billingE} />
                      <Num v={row.billingML} ml />
                      <td style={{ textAlign: "center", padding: "6px 10px" }}>
                        <button
                          onClick={e => { e.stopPropagation(); dlUserPDF(row.userId); }}
                          style={btnSmall}
                        >
                          PDF
                        </button>
                      </td>
                    </tr>

                    {/* Expanded record list */}
                    {expandedRows.has(key) && (
                      <tr>
                        <td colSpan={15} style={{ background: "#f1f5f9", padding: "0 16px 16px 32px" }}>
                          <div style={{ marginTop: 12 }}>
                            <strong style={{ fontSize: 13, color: "#0f172a" }}>
                              Completed Records — {row.name} / {sheetLabel} ({row.records?.length || 0})
                            </strong>
                            <div style={{ overflow: "auto", marginTop: 8 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
                                <thead>
                                  <tr style={{ background: "#0f172a", color: "#fff" }}>
                                    {["Ref ID", "Chemical", "Language", "Stage", "Completed At"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(row.records || []).length === 0 && (
                                    <tr><td colSpan={5} style={{ padding: 10, color: "#94a3b8", textAlign: "center" }}>
                                      No completed records in this period
                                    </td></tr>
                                  )}
                                  {(row.records || []).map((r, j) => (
                                    <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                      <td style={subTd}>{r.refId}</td>
                                      <td style={{ ...subTd, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.chemical || "—"}</td>
                                      <td style={subTd}>
                                        <span style={langBadgeStyle(r.language)}>{r.language || "—"}</span>
                                      </td>
                                      <td style={subTd}>
                                        <span style={{ ...stageBadge, ...STAGE_COLORS[r.stage] }}>{r.stage}</span>
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

/* ─── Sub-components ─── */

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 8, padding: "12px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Th({ children, center }) {
  return (
    <th style={{ padding: "10px 10px", textAlign: center ? "center" : "left", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Num({ v, ml, bold, prev, pending }) {
  const color = !v ? "#cbd5e1"
    : pending ? "#dc2626"
    : prev    ? "#2563eb"
    : bold    ? "#0f172a"
    : ml      ? "#7c3aed"
    : "#0f172a";
  return (
    <td style={{ padding: "9px 10px", textAlign: "center", fontWeight: (bold || pending || prev) ? 700 : 400, color }}>
      {v || 0}
    </td>
  );
}

/* ─── Styles ─── */

function langBadgeStyle(lang) {
  const ml = lang && lang.toLowerCase() !== "english";
  return {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: ml ? "#ede9fe" : "#dbeafe",
    color:      ml ? "#7c3aed" : "#1d4ed8",
  };
}

const stageBadge = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  textTransform: "capitalize",
};

const sheetBadge = {
  display: "inline-block",
  background: "#e2e8f0",
  color: "#334155",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 12,
  fontWeight: 600,
};

const subTd = {
  padding: "6px 10px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "middle",
};

const btnPrimary = {
  padding: "8px 16px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
};

const btnSmall = {
  padding: "4px 10px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 4,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const periodBtn = (active) => ({
  padding: "7px 14px",
  borderRadius: 6,
  border: "none",
  background: active ? "#2563eb" : "#e2e8f0",
  color: active ? "#fff" : "#0f172a",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: 13,
});
