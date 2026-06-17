import React, { useEffect, useState } from "react";
import UserLayout from "../../layouts/UserLayout";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function AssignedDQWork() {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks] = useState([]);
  const [sheet, setSheet] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD TASKS ================= */
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    loadTasks(1);
  }, [userId]);

  async function loadTasks(p = 1) {
    setLoading(true);

    try {
      const res = await api.get("/user/dq-tasks", {
        params: {
          userId,
          page: p,
          pageSize: PAGE_SIZE,
          sheet: sheet || undefined,
          q: search || undefined,
        },
      });

      if (res.data.ok) {
        setTasks(res.data.tasks || []);
        setTotal(res.data.total || 0);
        setPage(p);
      } else {
        setTasks([]);
        setTotal(0);
      }
    } catch (err) {
      console.error("DQ TASK LOAD ERROR:", err);
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  /* ================= OPEN DQ WORK ================= */
  function openDQ(task) {
    navigate(
      `/user/dq/work/${encodeURIComponent(
        task.repoId
      )}?sheet=${encodeURIComponent(task.sheet)}`
    );
  }

  return (
    <UserLayout>
      <div style={{ padding: 24 }}>
        <h1>My DQ Tasks</h1>

        {/* ================= FILTERS ================= */}
        <div style={{ display: "flex", gap: 12, marginBottom: 15 }}>
          <input
            placeholder="Filter by sheet"
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            style={input}
          />

          <input
            placeholder="Search Repo ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={input}
          />

          <button
            onClick={() => loadTasks(1)}
            style={buttonPrimary}
            disabled={loading}
          >
            Apply Filters
          </button>

          <div style={{ marginLeft: "auto" }}>
            <small>
              Page {page} / {Math.ceil(total / PAGE_SIZE) || 1} ({total} records)
            </small>
          </div>
        </div>

        {/* ================= LOADING ================= */}
        {loading && <p>Loading...</p>}

        {/* ================= TABLE ================= */}
        {!loading && (
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Sheet</th>
                <th style={th}>Repo ID</th>
                <th style={th}>Status</th>
                <th style={th}>Assigned To</th>
                <th style={th}>Action</th>
              </tr>
            </thead>

            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                    No DQ tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={`${t.sheet}_${t.repoId}`}>
                    <td style={td}>{t.sheet}</td>
                    <td style={td}>{t.repoId}</td>
                    <td style={td}>{t.status || "pending"}</td>
                    <td style={td}>{t.assignedTo || "-"}</td>
                    <td style={td}>
                      <button
                        onClick={() => openDQ(t)}
                        style={buttonSmall}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* ================= PAGINATION ================= */}
        {!loading && total > 0 && (
          <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
            <button
              disabled={page <= 1 || loading}
              onClick={() => loadTasks(page - 1)}
              style={pageBtn}
            >
              Prev
            </button>

            <button
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              onClick={() => loadTasks(page + 1)}
              style={pageBtn}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </UserLayout>
  );
}

/* ================= STYLES ================= */

const input = {
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid #ccc",
};

const buttonPrimary = {
  padding: "8px 14px",
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const buttonSmall = {
  padding: "6px 10px",
  background: "#0f172a",
  color: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};

const table = {
  width: "100%",
  background: "#fff",
  borderCollapse: "collapse",
  marginTop: 10,
};

const th = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  textAlign: "left",
  padding: 10,
};

const td = {
  border: "1px solid #e5e7eb",
  padding: 10,
};

const pageBtn = {
  padding: "6px 12px",
  borderRadius: 6,
  background: "#fff",
  border: "1px solid #ccc",
  cursor: "pointer",
};
