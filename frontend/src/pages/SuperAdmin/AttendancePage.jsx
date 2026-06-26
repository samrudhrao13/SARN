import React, { useEffect, useRef, useState } from "react";
import api from "../../config/apiClient";

const EXPECTED = 480; // 8 hrs
const IST_HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9am–6pm
const IDLE_THRESHOLD = 3; // minutes
const TODAY = new Date().toISOString().slice(0, 10);

export default function AttendancePage() {
  /* ── state ── */
  const [rows, setRows]               = useState([]);
  const [roleFilter, setRoleFilter]   = useState("ALL");
  const [date, setDate]               = useState(TODAY);
  const [month, setMonth]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  const [activeUsers, setActiveUsers] = useState([]);
  const [streaks, setStreaks]         = useState({});
  const [records, setRecords]         = useState({});
  const [streakLoading, setStreakLoading]   = useState(false);
  const [recordsLoading, setRecordsLoading] = useState(false);

  const liveInterval = useRef(null);

  /* ── on mount ── */
  useEffect(() => {
    loadAttendance({ date: TODAY });
    loadActiveUsers();
    loadStreaks();
    loadRecordsToday();

    liveInterval.current = setInterval(loadActiveUsers, 60_000);
    return () => clearInterval(liveInterval.current);
  }, []);

  /* ── loaders ── */
  async function loadAttendance(params = {}) {
    setLoading(true); setError("");
    try {
      const q = new URLSearchParams(params).toString();
      const res = await api.get(`/super-admin/attendance?${q}`);
      if (res.data.ok) setRows(res.data.rows || []);
      else setError("Failed to load attendance");
    } catch { setError("Server error"); }
    finally { setLoading(false); }
  }

  async function loadActiveUsers() {
    try {
      const res = await api.get("/super-admin/active-users");
      if (res.data.ok) setActiveUsers(res.data.users || []);
    } catch {}
  }

  async function loadStreaks() {
    setStreakLoading(true);
    try {
      const res = await api.get("/super-admin/streaks");
      if (res.data.ok) setStreaks(res.data.streaks || {});
    } catch {}
    finally { setStreakLoading(false); }
  }

  async function loadRecordsToday() {
    setRecordsLoading(true);
    try {
      const res = await api.get("/super-admin/records-today");
      if (res.data.ok) setRecords(res.data.counts || {});
    } catch {}
    finally { setRecordsLoading(false); }
  }

  function applyFilters() {
    const params = {};
    if (date)  params.date  = date;
    if (month) params.month = month;
    loadAttendance(params);
  }

  function clearFilters() {
    setDate(TODAY); setMonth(""); loadAttendance({ date: TODAY });
  }

  /* ── derived ── */
  const liveUsers = activeUsers.filter(u => (u.idleMinutes ?? 0) < IDLE_THRESHOLD);
  const idleUsers = activeUsers.filter(u => (u.idleMinutes ?? 0) >= IDLE_THRESHOLD);

  const filtered = roleFilter === "ALL"
    ? rows
    : rows.filter(r => r.role?.toUpperCase() === roleFilter);

  const summary = {
    total:     filtered.length,
    activeNow: liveUsers.length,
    completed: filtered.filter(r => r.status === "COMPLETED").length,
    avgEff:    filtered.length
      ? Math.round(filtered.reduce((s, r) => s + Math.min(100, (r.liveTotalMinutes ?? r.totalMinutes ?? 0) / EXPECTED * 100), 0) / filtered.length)
      : 0,
  };

  /* ── CSV export ── */
  function exportCSV() {
    const headers = ["Name","UserID","Role","Date","Sessions","Worked(hrs)","Expected(hrs)","Efficiency%","Status","Streak","Records(SDS)","Records(DQ)","Records(Batch)","LateStart","EarlyLogout"];
    const csvRows = filtered.map(r => {
      const mins = r.liveTotalMinutes ?? r.totalMinutes ?? 0;
      const eff  = Math.min(100, Math.round(mins / EXPECTED * 100));
      const rec  = records[r.userId?.toUpperCase()] || {};
      return [
        r.name, r.userId, r.role, r.date,
        r.sessions?.length || 0,
        (mins / 60).toFixed(2), "8",
        eff + "%",
        r.status === "COMPLETED" ? "Completed" : "In Progress",
        streaks[r.userId] ?? 0,
        rec.sds ?? 0, rec.dq ?? 0, rec.batch ?? 0,
        r.lateStart ? "Yes" : "No",
        r.earlyLogout ? "Yes" : "No",
      ].join(",");
    });
    const blob = new Blob([headers.join(",") + "\n" + csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `attendance_${date || month || "all"}.csv`; a.click();
  }

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>

      {/* ── Header ── */}
      <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Attendance &amp; Productivity Monitor
      </h2>
      <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
        Real-time tracking · 8 hrs daily target (9am–6pm IST)
      </p>

      {/* ── LIVE NOW panel ── */}
      <Section title="Live Now" accent="#16a34a" count={liveUsers.length}>
        {liveUsers.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No users actively working right now.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {liveUsers.map(u => {
              const liveTotal = u.totalMinutes + u.currentSessionMinutes;
              const pct = Math.min(100, Math.round(liveTotal / EXPECTED * 100));
              return (
                <div key={u.userId} style={liveCard}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{u.name || u.userId}</span>
                    <span style={rolePill(u.role)}>{u.role}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, marginBottom: 4 }}>
                    Active · session {fmtMins(u.currentSessionMinutes)}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                    Today: <strong>{fmtMins(liveTotal)}</strong> / 8 hrs
                  </div>
                  <ProgressBar pct={pct} color={pct >= 100 ? "#22c55e" : pct >= 75 ? "#3b82f6" : pct >= 50 ? "#f59e0b" : "#ef4444"} />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── IDLE NOW panel ── */}
      <Section title="Idle Now" accent="#d97706" count={idleUsers.length}>
        {idleUsers.length === 0 ? (
          <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No idle users detected.</p>
        ) : (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {idleUsers.map(u => {
              const liveTotal = u.totalMinutes + u.currentSessionMinutes;
              const pct = Math.min(100, Math.round(liveTotal / EXPECTED * 100));
              return (
                <div key={u.userId} style={{ ...liveCard, borderLeft: "3px solid #f59e0b" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{u.name || u.userId}</span>
                    <span style={rolePill(u.role)}>{u.role}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "#d97706", fontWeight: 700 }}>
                      Idle {u.idleMinutes} min
                    </span>
                    <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
                      IDLE
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 6 }}>
                    Today: <strong>{fmtMins(liveTotal)}</strong> / 8 hrs
                  </div>
                  <ProgressBar pct={pct} color="#f59e0b" />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Summary Stats ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <SummaryCard label="Active Now"        value={summary.activeNow} accent="#16a34a" bg="#dcfce7" />
        <SummaryCard label="Total Records"     value={summary.total}     accent="#2563eb" bg="#dbeafe" />
        <SummaryCard label="Completed 8h"      value={summary.completed} accent="#0891b2" bg="#cffafe" />
        <SummaryCard label="Avg Efficiency"    value={summary.avgEff + "%"} accent="#7c3aed" bg="#ede9fe" />
      </div>

      {/* ── Filter Bar ── */}
      <div style={filterBar}>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={sel}>
          <option value="ALL">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setMonth(""); }} style={sel} />
        <input type="month" value={month} onChange={e => { setMonth(e.target.value); setDate(""); }} style={sel} />
        <button onClick={applyFilters} style={btnBlue}>Apply</button>
        <button onClick={clearFilters} style={btnRed}>Clear</button>
        <button onClick={exportCSV} style={btnGreen}>⬇ Export CSV</button>
        {filtered.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error   && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
      {loading && <p style={{ color: "#64748b" }}>Loading attendance...</p>}

      {/* ── Main Table ── */}
      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={table}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#fff" }}>
                <Th>Employee</Th>
                <Th>User ID</Th>
                <Th>Role</Th>
                <Th>Date</Th>
                <Th>Sessions</Th>
                <Th>Worked</Th>
                <Th>Remaining</Th>
                <Th>Efficiency</Th>
                <Th>Status</Th>
                <Th>Streak</Th>
                <Th>Records Today</Th>
                <Th>Flags</Th>
                <Th>Activity (9am–6pm)</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="13" style={{ textAlign: "center", padding: 32, color: "#94a3b8" }}>No attendance data</td></tr>
              ) : (
                filtered.map((r, i) => {
                  const mins     = r.liveTotalMinutes ?? r.totalMinutes ?? 0;
                  const remaining = Math.max(0, EXPECTED - mins);
                  const pct      = Math.min(100, Math.round(mins / EXPECTED * 100));
                  const badge    = effBadge(pct);
                  const isDone   = r.status === "COMPLETED";
                  const rec      = records[r.userId?.toUpperCase()] || {};
                  const streak   = streaks[r.userId] ?? null;

                  return (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      {/* Employee */}
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {r.isCurrentlyActive && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />}
                          <span style={{ fontWeight: 600 }}>{r.name || "-"}</span>
                        </div>
                      </Td>
                      {/* User ID */}
                      <Td center><code style={{ fontSize: 12 }}>{r.userId}</code></Td>
                      {/* Role */}
                      <Td center><span style={rolePill(r.role)}>{r.role}</span></Td>
                      {/* Date */}
                      <Td center>{r.date}</Td>
                      {/* Sessions */}
                      <Td center>{r.sessions?.length || 0}</Td>
                      {/* Worked */}
                      <Td center>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{fmtMins(mins)}</div>
                          <ProgressBar pct={pct} color={badge.color} height={4} />
                        </div>
                      </Td>
                      {/* Remaining */}
                      <Td center style={{ color: isDone ? "#16a34a" : "#dc2626" }}>
                        {isDone ? "—" : fmtMins(remaining)}
                      </Td>
                      {/* Efficiency */}
                      <Td center>
                        <span style={{ background: badge.color, color: "#fff", padding: "3px 9px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                          {pct}%
                        </span>
                      </Td>
                      {/* Status */}
                      <Td center>
                        <span style={{ background: isDone ? "#dcfce7" : "#fef9c3", color: isDone ? "#15803d" : "#854d0e", padding: "3px 10px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                          {isDone ? "Completed" : "In Progress"}
                        </span>
                      </Td>
                      {/* Streak */}
                      <Td center>
                        {streakLoading ? <Skeleton /> : (
                          streak !== null && streak > 0
                            ? <span style={{ fontSize: 13 }}>🔥 {streak}d</span>
                            : <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>
                        )}
                      </Td>
                      {/* Records Today */}
                      <Td center>
                        {recordsLoading ? <Skeleton /> : (
                          rec.total > 0
                            ? <span style={{ fontSize: 12 }}>
                                <span style={recBadge("#dbeafe","#1e40af")}>S:{rec.sds||0}</span>{" "}
                                <span style={recBadge("#fce7f3","#9d174d")}>D:{rec.dq||0}</span>{" "}
                                <span style={recBadge("#d1fae5","#065f46")}>B:{rec.batch||0}</span>
                              </span>
                            : <span style={{ color: "#94a3b8", fontSize: 12 }}>0</span>
                        )}
                      </Td>
                      {/* Flags */}
                      <Td center>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                          {r.lateStart   && <span style={flag("#fef3c7","#92400e")}>Late Start</span>}
                          {r.earlyLogout && <span style={flag("#fee2e2","#991b1b")}>Early Out</span>}
                          {!r.lateStart && !r.earlyLogout && <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>}
                        </div>
                      </Td>
                      {/* Activity Heatmap */}
                      <Td center>
                        <HeatMap hourlyActivity={r.hourlyActivity || []} />
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─────────── sub-components ─────────── */

function Section({ title, accent, count, children }) {
  return (
    <div style={{ marginBottom: 20, padding: 16, background: "#fff", borderRadius: 12, borderLeft: `4px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: accent, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        {title}
        <span style={{ background: accent, color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

function SummaryCard({ label, value, accent, bg }) {
  return (
    <div style={{ padding: "14px 20px", background: bg, borderRadius: 10, borderLeft: `4px solid ${accent}`, minWidth: 130, flex: "0 0 auto" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{value}</div>
    </div>
  );
}

function ProgressBar({ pct, color, height = 5 }) {
  return (
    <div style={{ width: "100%", height, background: "#e2e8f0", borderRadius: 4, overflow: "hidden", marginTop: 4 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
    </div>
  );
}

function HeatMap({ hourlyActivity }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {IST_HOURS.map(h => (
        <div
          key={h}
          title={`${h}:00–${h + 1}:00 IST (${h < 12 ? h + "am" : h === 12 ? "12pm" : (h - 12) + "pm"})`}
          style={{
            width: 12, height: 14, borderRadius: 2,
            background: hourlyActivity[h] ? "#22c55e" : "#e2e8f0",
          }}
        />
      ))}
    </div>
  );
}

function Skeleton() {
  return <div style={{ width: 40, height: 12, background: "#e2e8f0", borderRadius: 4, margin: "0 auto" }} />;
}

function Th({ children }) {
  return <th style={{ padding: "11px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, center, style: extra }) {
  return <td style={{ padding: "10px 14px", border: "1px solid #e5e7eb", fontSize: 13, textAlign: center ? "center" : "left", verticalAlign: "middle", ...extra }}>{children}</td>;
}

/* ─────────── helpers ─────────── */

function fmtMins(m) {
  const h = Math.floor(m / 60);
  const mn = Math.round(m % 60);
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`;
}

function effBadge(pct) {
  if (pct < 50)  return { color: "#ef4444" };
  if (pct < 75)  return { color: "#f59e0b" };
  if (pct < 100) return { color: "#3b82f6" };
  return { color: "#22c55e" };
}

function rolePill(role) {
  const isAdmin = String(role).toUpperCase() === "ADMIN";
  return {
    background: isAdmin ? "#e0e7ff" : "#dcfce7",
    color: isAdmin ? "#3730a3" : "#15803d",
    padding: "2px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11,
  };
}

const recBadge = (bg, color) => ({
  background: bg, color, padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: 11,
});

const flag = (bg, color) => ({
  background: bg, color, padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
});

/* ─────────── styles ─────────── */
const liveCard = {
  padding: "12px 16px", background: "#f8fafc", borderRadius: 10,
  border: "1px solid #e2e8f0", minWidth: 200, flex: "0 0 auto",
};
const filterBar = {
  display: "flex", gap: 10, alignItems: "center",
  marginBottom: 16, flexWrap: "wrap",
};
const sel = {
  padding: "7px 10px", borderRadius: 8,
  border: "1px solid #cbd5e1", fontSize: 13,
  background: "#fff", color: "#0f172a",
};
const btnBlue  = { padding: "7px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnRed   = { padding: "7px 14px", border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const btnGreen = { padding: "7px 14px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13 };
const table    = { width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
