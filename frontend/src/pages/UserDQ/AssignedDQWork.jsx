import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

function DueDateBadge({ dueDate }) {
  if (!dueDate) return <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>;
  const due  = new Date(dueDate + "T00:00:00Z");
  const now  = new Date(); now.setUTCHours(0, 0, 0, 0);
  const days = Math.ceil((due - now) / 86400000);
  let bg, color, icon;
  if (days < 0)       { bg = "#fef2f2"; color = "#dc2626"; icon = "🔴"; }
  else if (days <= 2) { bg = "#fff7ed"; color = "#ea580c"; icon = "🟠"; }
  else if (days <= 7) { bg = "#fefce8"; color = "#ca8a04"; icon = "🟡"; }
  else                { bg = "#f0fdf4"; color = "#16a34a"; icon = "🟢"; }
  const label = days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`;
  return (
    <span style={{ background: bg, color, padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {icon} {dueDate} · {label}
    </span>
  );
}

export default function AssignedDQWork() {
  const navigate = useNavigate();
  const user   = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks]   = useState([]);
  const [sheet, setSheet]   = useState(() => localStorage.getItem("sarn_dq_sheet") || "");
  const [search, setSearch] = useState(() => localStorage.getItem("sarn_dq_search") || "");
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheetDueDates, setSheetDueDates] = useState({});

  useEffect(() => {
    api.get("/sheets/due-dates").then(res => {
      if (res.data.ok) setSheetDueDates(res.data.dq || {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadTasks(1);
  }, [userId]);

  async function loadTasks(p = 1) {
    setLoading(true);
    try {
      const res = await api.get("/user/dq-tasks", {
        params: { userId, page: p, pageSize: PAGE_SIZE, sheet: sheet || undefined, q: search || undefined },
      });
      if (res.data.ok) {
        const raw = res.data.tasks || [];
        raw.sort((a, b) => {
          const ta = a.assignedAt?._seconds ?? a.assignedAt ?? 0;
          const tb = b.assignedAt?._seconds ?? b.assignedAt ?? 0;
          return tb - ta;
        });
        setTasks(raw);
        setTotal(res.data.total || raw.length);
        setPage(p);
      } else {
        setTasks([]); setTotal(0);
      }
    } catch (err) {
      console.error("DQ TASK LOAD ERROR:", err);
      setTasks([]); setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>My DQ Tasks</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Filter by sheet" value={sheet} onChange={e => { setSheet(e.target.value); localStorage.setItem("sarn_dq_sheet", e.target.value); }} style={inp} />
        <input placeholder="Search Repo ID"  value={search} onChange={e => { setSearch(e.target.value); localStorage.setItem("sarn_dq_search", e.target.value); }} style={inp} />
        <button onClick={() => loadTasks(1)} style={primaryBtn} disabled={loading}>Apply Filters</button>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
          Page {page} / {Math.ceil(total / PAGE_SIZE) || 1} &nbsp;({total} records)
        </span>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Sheet</th>
              <th style={th}>Due Date</th>
              <th style={th}>Repo ID</th>
              <th style={th}>Status</th>
              <th style={th}>Assigned To</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>No DQ tasks found.</td></tr>
            ) : tasks.map((t, i) => (
              <tr key={`${t.sheet}_${t.repoId}`} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={td}>{t.sheet}</td>
                <td style={td}><DueDateBadge dueDate={sheetDueDates[t.sheet]} /></td>
                <td style={td}>{t.repoId}</td>
                <td style={td}><span style={assignedBadge}>{t.status || "assigned"}</span></td>
                <td style={td}>{t.assignedTo || "-"}</td>
                <td style={td}>
                  <button onClick={() => navigate(`/user/dq/work/${encodeURIComponent(t.repoId)}?sheet=${encodeURIComponent(t.sheet)}`)} style={openBtn}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && total > 0 && (
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button disabled={page <= 1 || loading} onClick={() => loadTasks(page - 1)} style={pageBtn}>◀ Prev</button>
          <button disabled={page >= Math.ceil(total / PAGE_SIZE) || loading} onClick={() => loadTasks(page + 1)} style={pageBtn}>Next ▶</button>
        </div>
      )}
    </>
  );
}

const inp         = { padding: "8px 12px", borderRadius: 6, border: "1.5px solid #94a3b8", fontSize: 13, color: "#0f172a" };
const primaryBtn  = { padding: "8px 16px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const openBtn     = { padding: "6px 14px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 };
const pageBtn     = { padding: "6px 14px", borderRadius: 6, background: "#fff", border: "1px solid #cbd5e1", cursor: "pointer", fontSize: 13 };
const assignedBadge = { background: "#bfdbfe", color: "#1e40af", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12 };
const table       = { width: "100%", borderCollapse: "collapse", marginTop: 4 };
const th          = { padding: 10, background: "#0f172a", color: "#fff", border: "1px solid #1e293b", textAlign: "left", fontSize: 13, fontWeight: 600 };
const td          = { padding: 10, border: "1px solid #e5e7eb", fontSize: 13 };
