import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

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

export default function BatchTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
    const pageSize = 100;

    const [total, setTotal] = useState(0);

    const [counts, setCounts] = useState({
    assigned: 0,
    completed: 0,
    pending: 0,
    });
        const [language, setLanguage] =
    useState(() => localStorage.getItem("sarn_batch_language") || "");

    const [languages, setLanguages] =
    useState([]);

    const [sheet, setSheet] = useState(() => localStorage.getItem("sarn_batch_sheet") || "");
    const [sheets, setSheets] = useState([]);
    const [sheetDueDates, setSheetDueDates] = useState({});

    const [searchRepo, setSearchRepo] =
  useState("");

  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

  useEffect(() => {
    api.get("/sheets/due-dates").then(res => {
      if (res.data.ok) setSheetDueDates(res.data.batch || {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
  loadTasks();
}, [page, language, sheet]);

  async function loadTasks() {
    try {
            const res = await api.get(
                "/user/batch-tasks",
                {
            params: {
            userId: user.userId,
            page,
            pageSize,
            language,
            sheet,
            },
                }
            );

        if (res.data.ok) {
  setTasks(res.data.tasks || []);

  setLanguages(
    res.data.languages || []
  );

  setSheets(
    res.data.sheets || []
  );

  setTotal(
    res.data.pagination?.total || 0
  );

  setCounts(
    res.data.counts || {
      assigned: 0,
      completed: 0,
      pending: 0,
    }
  );
}
    } 
    catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  const filteredTasks =
  tasks.filter(task =>
    String(
      task.newRepository || ""
    )
      .toLowerCase()
      .includes(
        searchRepo
          .trim()
          .toLowerCase()
      )
  );

  function openTask(task) {
    navigate(
      `/user/batch/work/${task.sheet}/${task.recordId}`
    );
  }

  return (
  <div
    style={{
      width: "100%",
      boxSizing: "border-box",
    }}
  >
      <h2>
        Assigned Batch Tasks ({total})
        </h2>
        <div
        style={{
            display: "flex",
            gap: 30,
            marginBottom: 20,
            marginTop: 10,
        }}
        >
        <div>
            <strong>Assigned:</strong>{" "}
            {counts.assigned}
        </div>

        <div>
            <strong>Completed:</strong>{" "}
            {counts.completed}
        </div>

        <div>
            <strong>Pending:</strong>{" "}
            {counts.pending}
        </div>
        </div>
        <div
  style={{
    marginBottom: 20,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  }}
>
  <select
    value={sheet}
    onChange={e => {
      setSheet(e.target.value);
      localStorage.setItem("sarn_batch_sheet", e.target.value);
      setPage(1);
    }}
    style={{
      padding: "8px 12px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      fontWeight: 600,
      minWidth: 180,
    }}
  >
    <option value="">All Sheets</option>
    {sheets.map(s => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <select
    value={language}
    onChange={e => {
      setLanguage(e.target.value);
      localStorage.setItem("sarn_batch_language", e.target.value);
      setPage(1);
    }}
    style={{
      padding: "8px 12px",
      border: "1px solid #ccc",
      borderRadius: "6px",
      minWidth: 150,
    }}
  >
    <option value="">
      All Languages
    </option>

    {languages.map(l => (
      <option
        key={l}
        value={l}
      >
        {l}
      </option>
    ))}
  </select>
  <div
  style={{
    marginBottom: 20,
  }}
>
  <input
    type="text"
    placeholder="Search Repository Number"
    value={searchRepo}
    onChange={e =>
      setSearchRepo(
        e.target.value
      )
    }
    style={{
      padding: "8px",
      width: "300px",
      border:
        "1px solid #ccc",
      borderRadius: "6px",
    }}
  />
</div>
</div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          border="1"
          width="100%"
          cellPadding="8"
        >
          <thead>
            <tr
              style={{
                background: "#f1f5f9",
              }}
            >
              <th>Sheet</th>
              <th>Due Date</th>
              <th>New Repository</th>

              <th>Chemical Name</th>
              <th>Language</th>
              <th>Duplicate</th>

              <th>Status</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredTasks.map(task => (
              <tr
                key={task.recordId}
                style={{
                    background:
                    task.duplicate
                        ? "#fee2e2"
                        : "white",
                }}
                >
                <td>{task.sheet}</td>
                <td><DueDateBadge dueDate={sheetDueDates[task.sheet]} /></td>

                <td>
                  {task.newRepository || "-"}
                </td>

                <td>
  {task.chemicalName}
</td>
<td>
  {task.language || "-"}
</td>

<td>
  {task.duplicate ? (
    <span
      style={{
        background: "#dc2626",
        color: "#fff",
        padding: "4px 8px",
        borderRadius: 4,
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      DUPLICATE
    </span>
  ) : (
    <span
      style={{
        color: "#16a34a",
        fontWeight: 600,
      }}
    >
      NORMAL
    </span>
  )}
</td>

<td>
  <StatusBadge
                    status={
                      task.status
                    }
                  />
                </td>

                <td>
                  <button
                    onClick={() =>
                      openTask(task)
                    }
                    style={{
                      padding:
                        "6px 12px",
                      border: "none",
                      borderRadius: 6,
                      background:
                        "#2563eb",
                      color: "#fff",
                      cursor:
                        "pointer",
                    }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}

            {filteredTasks.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  No assigned batch
                  records
                </td>
              </tr>
            )}
          </tbody>
        </table>

      )}
      <div
  style={{
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
    gap: 10,
    alignItems: "center",
  }}
>
  <button
    disabled={page === 1}
    onClick={() =>
      setPage(page - 1)
    }
  >
    Previous
  </button>

  <span>
    Page {page} of{" "}
    {Math.ceil(total / pageSize)}
  </span>

  <button
    disabled={
      page >=
      Math.ceil(total / pageSize)
    }
    onClick={() =>
      setPage(page + 1)
    }
  >
    Next
  </button>
</div>
    </div>
  );
}

/* ================= STATUS BADGE ================= */

function StatusBadge({ status }) {
  let bg = "#facc15";
  let text = "#000";

  if (
    status === "completed"
  ) {
    bg = "#16a34a";
    text = "#fff";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 20,
        background: bg,
        color: text,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {status || "pending"}
    </span>
  );
}