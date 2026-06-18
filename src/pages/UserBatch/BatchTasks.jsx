import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

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
    useState("");

    const [languages, setLanguages] =
    useState([]);

  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

  useEffect(() => {
  loadTasks();
}, [page, language]);

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
            },
                }
            );
            
        if (res.data.ok) {
  setTasks(res.data.tasks || []);

  setLanguages(
    res.data.languages || []
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

  function openTask(task) {
    navigate(
      `/user/batch/work/${task.sheet}/${task.recordId}`
    );
  }

  return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
      minHeight: "100vh",
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
  }}
>
  <select
    value={language}
    onChange={e => {
      setLanguage(
        e.target.value
      );
      setPage(1);
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

              <th>New Repository</th>

              <th>Chemical Name</th>
              <th>Language</th>
              <th>Duplicate</th>

              <th>Status</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(task => (
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

            {tasks.length === 0 && (
              <tr>
                <td
                  colSpan="7"
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