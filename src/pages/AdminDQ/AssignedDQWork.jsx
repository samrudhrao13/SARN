import React, { useEffect, useState } from "react";
import UserLayout from "../../layouts/UserLayout";
import api from "../../config/apiClient";

export default function AssignedDQWork() {
  const [tasks, setTasks] = useState([]);

  const stored = localStorage.getItem("sarnUser");
  const userObj = stored ? JSON.parse(stored) : null;
  const userId = userObj?.userId || userObj?.email || "";

  useEffect(() => {
    if (!userId) return;

    api
      .get("/user-tasks", { params: { userId } })
      .then((res) => {
        if (res.data.ok) setTasks(res.data.tasks || []);
      })
      .catch((err) => {
        console.error("DQ TASK LOAD ERROR:", err);
      });
  }, [userId]);

  return (
    <UserLayout>
      <h1 style={{ fontSize: 26, marginBottom: 20 }}>My DQ Tasks</h1>

      <div
        style={{
          background: "white",
          borderRadius: 10,
          padding: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={th}>Sheet</th>
              <th style={th}>Repo ID</th>
              <th style={th}>Stage</th>
              <th style={th}>Assigned</th>
              <th style={th}>Action</th>
            </tr>
          </thead>

          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: "center" }}>
                  No tasks assigned.
                </td>
              </tr>
            ) : (
              tasks.map((t) => (
                <tr key={t.referenceId} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={td}>{t.sheet}</td>
                  <td style={td}>{t.referenceId}</td>
                  <td style={td}>{t.currentStage || t.status}</td>
                  <td style={td}>{t.assignedTo}</td>
                  <td style={td}>
                    <button
                      onClick={() =>
                        window.location.href = `/user/dq/work/${t.referenceId}?sheet=${t.sheet}`
                      }
                      style={{
                        padding: "6px 12px",
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </UserLayout>
  );
}

const th = {
  padding: "12px",
  fontWeight: "bold",
  textAlign: "left",
  borderBottom: "1px solid #e2e8f0",
};

const td = {
  padding: "12px",
};
