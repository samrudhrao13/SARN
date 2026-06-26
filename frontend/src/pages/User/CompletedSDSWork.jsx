import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const normalizeSheet = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

export default function CompletedSDSWork() {
  const navigate = useNavigate();
  const user   = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [sheets, setSheets]         = useState([]);
  const [sheetFilter, setSheetFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [summary, setSummary]       = useState({ assignedCount: 0, pendingCount: 0, completedCount: 0 });

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    loadTasks("");
  }, [userId]);

  async function loadTasks(sheet) {
    setLoading(true);
    try {
      const res = await api.get("/user/completed-sds-tasks", { params: { userId, sheet } });
      if (res.data.ok) {
        const raw = res.data.tasks || [];
        raw.sort((a, b) => {
          const ta = a.completedAt?._seconds ?? a.completedAt ?? 0;
          const tb = b.completedAt?._seconds ?? b.completedAt ?? 0;
          return tb - ta;
        });
        setTasks(raw);
        setSheets(res.data.sheets || []);
        setSummary(res.data.summary || {});
      }
    } catch { setTasks([]); }
    finally { setLoading(false); }
  }

  function handleSheetChange(val) {
    setSheetFilter(val);
    setStageFilter("");
    loadTasks(val);
  }

  // Stage filter is client-side (tasks already sheet-filtered by API)
  const filtered = stageFilter ? tasks.filter(t => t.stage === stageFilter) : tasks;

  return (
    <>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Completed SDS Work</h1>
      <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
        Filter by sheet to see counts for that sheet. Each row shows the stage you completed.
      </p>

      {/* ── Count Cards ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Assigned" value={summary.assignedCount ?? 0} bg="#fff7ed" accent="#ea580c" />
        <StatCard label="Pending"  value={summary.pendingCount  ?? 0} bg="#fef3c7" accent="#d97706" />
        <StatCard label="Completed" value={summary.completedCount ?? 0} bg="#dcfce7" accent="#16a34a" />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <label style={lbl}>Sheet:</label>
        <select style={filterInput} value={sheetFilter} onChange={e => handleSheetChange(e.target.value)}>
          <option value="">All Sheets</option>
          {sheets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <label style={lbl}>Stage:</label>
        <select style={filterInput} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">All Stages</option>
          <option value="search">Search</option>
          <option value="supersede">Supersede</option>
          <option value="transcription">Transcription</option>
        </select>

        <button style={clearBtn} onClick={() => { handleSheetChange(""); setStageFilter(""); }}>
          Clear Filters
        </button>

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#64748b" }}>No completed tasks found.</p>}

      {!loading && filtered.length > 0 && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Reference ID</th>
              <th style={th}>Company</th>
              <th style={th}>Sheet</th>
              <th style={th}>Stage</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={`${t.sheet}_${t.referenceId}_${t.stage}`} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={td}>{t.referenceId}</td>
                <td style={td}>{t.company || "SARN"}</td>
                <td style={td}>{normalizeSheet(t.sheet)}</td>
                <td style={td}><StageBadge stage={t.stage} /></td>
                <td style={td}><StatusBadge /></td>
                <td style={td}>
                  <button
                    style={btn}
                    onClick={() => navigate(`/user/work/${normalizeSheet(t.sheet)}/${encodeURIComponent(String(t.referenceId))}`)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function StatCard({ label, value, bg, accent }) {
  return (
    <div style={{ padding: "14px 20px", background: bg, borderRadius: 10, borderLeft: `4px solid ${accent}`, minWidth: 140, flex: "0 0 auto" }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  );
}

function StageBadge({ stage }) {
  const colors = { search: "#c7d2fe", supersede: "#fde68a", transcription: "#fbcfe8" };
  return (
    <span style={{ background: colors[stage] || "#e5e7eb", padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>
      {stage}
    </span>
  );
}

function StatusBadge() {
  return <span style={{ background: "#16a34a", color: "#fff", padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>completed</span>;
}

const table       = { width: "100%", borderCollapse: "collapse", marginTop: 4 };
const th          = { padding: 10, background: "#0f172a", color: "#fff", border: "1px solid #1e293b", textAlign: "left", fontSize: 13, fontWeight: 600 };
const td          = { padding: 10, border: "1px solid #e5e7eb", fontSize: 13 };
const btn         = { padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 };
const filterInput = { padding: "8px 12px", border: "1.5px solid #94a3b8", borderRadius: 6, fontSize: 13, color: "#0f172a" };
const clearBtn    = { padding: "8px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const lbl         = { fontWeight: 600, fontSize: 13, color: "#374151" };
