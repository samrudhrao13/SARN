import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

/* ================= HELPERS ================= */

const normalizeSheet = (s) =>
  String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

const normalizeStage = (stage) => {
  if (!stage || stage === "pending") return "search";
  return stage;
};

/* ================= COMPONENT ================= */

export default function AssignedSDSWork() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetDueDates, setSheetDueDates] = useState({});
  const [stageFilter, setStageFilter] = useState(() => localStorage.getItem("sarn_sds_stage") || "");
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem("sarn_sds_status") || "");
  const [sheetFilter, setSheetFilter] = useState(() => localStorage.getItem("sarn_sds_sheet") || "");

  useEffect(() => {
    api.get("/sheets/due-dates").then(res => {
      if (res.data.ok) setSheetDueDates(res.data.sds || {});
    }).catch(() => {});
  }, []);

  /* ================= LOAD TASKS ================= */
  useEffect(() => {
    if (!userId) return;

    async function loadTasks() {
      setLoading(true);
      try {
        const res = await api.get("/user/sds-tasks", {
          params: {
            userId,
            page: 1,
            pageSize: 100,
          },
        });

        const raw = res.data.ok ? res.data.tasks || [] : [];
        // Newest assigned first; fall back to referenceId descending
        raw.sort((a, b) => {
          const ta = a.assignedAt?._seconds ?? 0;
          const tb = b.assignedAt?._seconds ?? 0;
          if (tb !== ta) return tb - ta;
          return String(b.referenceId).localeCompare(String(a.referenceId), undefined, { numeric: true });
        });
        setTasks(raw);
      } catch (err) {
        console.error("LOAD SDS TASKS ERROR:", err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }

    loadTasks();
  }, [userId]);
  const filteredTasks = tasks.filter((t) => {
  const stageMatch =
    !stageFilter ||
    (t.stage || t.currentStage) === stageFilter;

  const statusMatch =
    !statusFilter ||
    t.status === statusFilter;

  const sheetMatch =
    !sheetFilter ||
    t.sheet === sheetFilter;

  return stageMatch && statusMatch && sheetMatch;
});

  /* ================= OPEN WORKFLOW ================= */
  function openWorkflow(task) {
    const sheet = normalizeSheet(task.sheet);
    const refId = encodeURIComponent(String(task.referenceId));

    navigate(`/user/work/${sheet}/${refId}`);
  }

  return (
    <>
      <h1>Assigned SDS Work</h1>
      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "nowrap",
  }}
>
  {/* Sheet */}
  <select
  style={filterInput}
  value={sheetFilter}
  onChange={(e) => { setSheetFilter(e.target.value); localStorage.setItem("sarn_sds_sheet", e.target.value); }}
>
    <option value="">All Sheets</option>
    {[...new Set(tasks.map(t => t.sheet))].map(s => (
      <option key={s} value={s}>
        {s}
      </option>
    ))}
  </select>

  {/* Stage */}
  <select
  style={filterInput}
  value={stageFilter}
  onChange={(e) => { setStageFilter(e.target.value); localStorage.setItem("sarn_sds_stage", e.target.value); }}
>
    <option value="">All Stages</option>
    <option value="search">Search</option>
    <option value="supersede">Supersede</option>
    <option value="transcription">Transcription</option>
    <option value="billing">Billing</option>
  </select>

  {/* Status */}
  <select
  style={filterInput}
  value={statusFilter}
  onChange={(e) => { setStatusFilter(e.target.value); localStorage.setItem("sarn_sds_status", e.target.value); }}
>
    <option value="">All Status</option>
    <option value="pending">Pending</option>
    <option value="Waiting Response">Waiting Response</option>
    <option value="File available">File available</option>
    <option value="No file Found">No file Found</option>
    <option value="completed">Completed</option>
  </select>

  <button
    style={clearFilterBtn}
    onClick={() => {
      setSheetFilter(""); setStageFilter(""); setStatusFilter("");
      localStorage.removeItem("sarn_sds_sheet");
      localStorage.removeItem("sarn_sds_stage");
      localStorage.removeItem("sarn_sds_status");
    }}
  >
    Clear Filters
  </button>
</div>

      {loading && <p>Loading...</p>}

      {!loading && filteredTasks.length === 0 && (
        <p>No tasks assigned.</p>
      )}

      {!loading && filteredTasks.length > 0 && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Reference ID</th>
              <th style={th}>Company</th>
              <th style={th}>Sheet</th>
              <th style={th}>Due Date</th>
              <th style={th}>Stage</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((t, i) => {
              const stage = normalizeStage(
                t.stage || t.currentStage
              );

              return (
                <tr key={i}>
                <td style={td}>{t.referenceId}</td>
                <td style={td}>{t.company || "SARN"}</td>
                <td style={td}>{normalizeSheet(t.sheet)}</td>

                <td style={td}>
                  <DueDateBadge dueDate={sheetDueDates[normalizeSheet(t.sheet)]} />
                </td>

                <td style={td}>
                  <StageBadge stage={stage} />
                </td>

                <td style={td}>
                  <StatusBadge status={t.status} />
                </td>

                <td style={td}>
                  <button
                    style={btn}
                    onClick={() => openWorkflow(t)}
                  >
                    Open
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ================= UI HELPERS ================= */

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
  const label = days < 0
    ? `${Math.abs(days)}d overdue`
    : days === 0 ? "Due today"
    : `${days}d left`;
  return (
    <span style={{ background: bg, color, padding: "3px 8px", borderRadius: 5, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {icon} {dueDate} · {label}
    </span>
  );
}

function StageBadge({ stage }) {
  const colors = {
    search: "#c7d2fe",
    supersede: "#fde68a",
    transcription: "#fbcfe8",
    billing: "#93c5fd",
  };

  return (
    <span
      style={{
        background: colors[stage] || "#e5e7eb",
        padding: "4px 12px",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 12,
        textTransform: "uppercase",
      }}
    >
      {stage}
    </span>
  );
}
function StatusBadge({ status }) {
  const colors = {
    pending: "#facc15",
    "Waiting Response": "#fb923c",
    "File available": "#22c55e",
    "No file Found": "#ef4444",
    completed: "#16a34a",
  };

  return (
    <span
      style={{
        background: colors[status] || "#e5e7eb",
        padding: "4px 12px",
        borderRadius: 6,
        fontWeight: 700,
        fontSize: 12,
      }}
    >
      {status || "pending"}
    </span>
  );
}

/* ================= STYLES ================= */

const table = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: 20,
};

const th = {
  padding: 10,
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  textAlign: "left",
};

const td = {
  padding: 10,
  border: "1px solid #e5e7eb",
};

const btn = {
  padding: "6px 14px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const filterInput = {
  width: "220px",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
};

const clearFilterBtn = {
  padding: "8px 14px",
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};