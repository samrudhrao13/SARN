import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

export default function BatchTasks() {
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const res = await api.get(
        "/user/batch-tasks",
        {
          params: {
            userId: user.userId,
          },
        }
      );

      if (res.data.ok) {
        setTasks(res.data.tasks || []);
      }
    } catch (err) {
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
      <h2>Assigned Batch Tasks</h2>

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

              <th>Status</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.map(task => (
              <tr key={task.recordId}>
                <td>{task.sheet}</td>

                <td>
                  {task.newRepository || "-"}
                </td>

                <td>
                  {task.chemicalName}
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
                  colSpan="5"
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