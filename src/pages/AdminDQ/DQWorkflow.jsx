import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient"; 

const PAGE_SIZE = 100;

export default function DQWorkflow() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("");

  /* ================= LOAD DQ SHEETS ================= */
  useEffect(() => {
    api
      .get("/dq/sheets")
      .then((res) => {
        if (res.data.ok) setSheets(res.data.sheets || []);
      })
      .catch(() => setSheets([]));
  }, []);

  /* ================= LOAD WORKFLOW ================= */
  async function loadWorkflow(p = 1) {
    if (!sheet) {
      alert("Select a DQ sheet");
      return;
    }

    setMsg("Loading...");

    try {
      const res = await api.get("/admin/dq/workflow", {
        params: {
          sheet,
          page: p,
          pageSize: PAGE_SIZE,
        },
      });

      if (!res.data.ok) {
        setRows([]);
        setTotal(0);
        setMsg("No data found");
        return;
      }

      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
      setPage(p);
      setMsg("");
    } catch (err) {
      console.error("DQ WORKFLOW ERROR:", err);
      setMsg("Failed to load workflow");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ================= FORCE COMPLETE ================= */
  async function forceAdvance(repoId) {
    if (!window.confirm("Force complete and move to Billing?")) return;

    try {
      const res = await api.post("/admin/dq/force-complete", {
        sheet,
        repoId,
      });

      if (!res.data.ok) {
        alert(res.data.error || "Force failed");
        return;
      }

      alert("Moved to Billing");
      loadWorkflow(page);
    } catch (err) {
      console.error(err);
      alert("Force failed");
    }
  }

  return (
    <AdminLayout>
      <h1>DQ — Workflow Tracking</h1>

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: 12, marginBottom: 15 }}>
        <select
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            setPage(1);
          }}
          style={select}
        >
          <option value="">Select DQ Sheet</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button onClick={() => loadWorkflow(1)} style={btn}>
          Load
        </button>
      </div>

      {msg && <p>{msg}</p>}

      {/* TABLE */}
      {rows.length > 0 && (
        <>
          <table border="1" width="100%" cellPadding="6">
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <th>SL No</th>
                <th>Repo ID</th>
                <th>Assigned To</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Billing</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => {
                const slNo = (page - 1) * PAGE_SIZE + i + 1;

                const rowBg = r.billingReady
                  ? "#DCFCE7"
                  : r.assignedTo
                  ? "#FEF3C7"
                  : "#FEE2E2";

                return (
                  <tr key={r.repoId} style={{ background: rowBg }}>
                    <td><b>{slNo}</b></td>
                    <td>{r.repoId}</td>
                    <td>{r.assignedTo || "-"}</td>
                    <td>{r.currentStage || "transcription"}</td>

                    <td>
                      <span style={statusChip(r.status)}>
                        {r.status || "pending"}
                      </span>
                    </td>

                    <td>
                      {r.billingReady ? (
                        <span style={ready}>READY</span>
                      ) : (
                        <span style={notReady}>NOT READY</span>
                      )}
                    </td>

                    <td>
                      {!r.billingReady && (
                        <button
                          onClick={() => forceAdvance(r.repoId)}
                          style={smallBtn}
                        >
                          Force → Billing
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div style={{ marginTop: 12 }}>
            <button
              disabled={page === 1}
              onClick={() => loadWorkflow(page - 1)}
            >
              Prev
            </button>

            <span style={{ margin: "0 10px" }}>
              Page {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => loadWorkflow(page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {!msg && rows.length === 0 && <p>No records found.</p>}
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const select = {
  padding: 8,
  borderRadius: 6,
  border: "1px solid #ccc",
  minWidth: 220,
};

const btn = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const smallBtn = {
  padding: "6px 10px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const ready = {
  background: "#4ade80",
  padding: "4px 10px",
  borderRadius: 6,
  fontWeight: "bold",
};

const notReady = {
  background: "#fca5a5",
  padding: "4px 10px",
  borderRadius: 6,
  fontWeight: "bold",
};

function statusChip(status) {
  const map = {
    pending: "#e5e7eb",
    assigned: "#fde68a",
    completed: "#86efac",
  };

  return {
    background: map[status] || "#e5e7eb",
    padding: "4px 10px",
    borderRadius: 6,
    fontWeight: "bold",
  };
}
