import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function DQList() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- LOAD DQ SHEETS ---------------- */
  useEffect(() => {
    api.get("/dq/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ---------------- LOAD DQ LIST ---------------- */
  useEffect(() => {
    if (!sheet) return;

    setLoading(true);
    setError("");

    api
      .get("/dq/list", {
        params: {
          sheet,
          page,
          pageSize: PAGE_SIZE,
        },
      })
      .then(res => {
        if (res.data.ok) {
          setRows(res.data.rows || []);
          setTotal(res.data.total || 0);
        } else {
          setRows([]);
          setError(res.data.error || "Failed to load data");
        }
      })
      .catch(() => {
        setRows([]);
        setError("Server error");
      })
      .finally(() => setLoading(false));
  }, [sheet, page]);

  /* ---------------- APPLY FILTER ---------------- */
  useEffect(() => {
    if (filter === "ALL") setFiltered(rows);
    else if (filter === "ASSIGNED")
      setFiltered(rows.filter(r => r.locked));
    else if (filter === "UNASSIGNED")
      setFiltered(rows.filter(r => !r.locked));
  }, [filter, rows]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const assignedCount = rows.filter(r => r.locked).length;
  const unassignedCount = rows.filter(r => !r.locked).length;

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 14 }}>📄 DQ List</h1>

      {/* CONTROLS */}
      <div style={headerCard}>
        <div style={headerRow}>
          <select
            value={sheet}
            onChange={e => {
              setSheet(e.target.value);
              setPage(1);
            }}
            style={selectStyle}
          >
            <option value="">📄 Select DQ Sheet</option>
            {sheets.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="ALL">All ({rows.length})</option>
            <option value="ASSIGNED">Assigned ({assignedCount})</option>
            <option value="UNASSIGNED">Unassigned ({unassignedCount})</option>
          </select>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* TABLE */}
      {!loading && filtered.length > 0 && (
        <table border="1" width="100%" cellPadding="6">
          <thead>
            <tr>
              <th>SL No</th>
              <th>Repo ID</th>
              <th>Stage</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr
                key={r.repoId}
                style={{
                  background: r.locked ? "#FEF3C7" : "#FEE2E2",
                }}
              >
                <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>{r.repoId}</td>
                <td>{r.stage || "transcription"}</td>
                <td>
                  <b style={{ color: r.locked ? "#92400e" : "#991b1b" }}>
                    {r.locked ? "Assigned" : "Unassigned"}
                  </b>
                </td>
                <td>{r.assignedTo || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && filtered.length === 0 && sheet && (
        <p>No records match the selected filter.</p>
      )}

      {/* PAGINATION */}
      {filtered.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button
            style={secondaryBtn}
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Prev
          </button>

          <span style={{ margin: "0 12px", fontWeight: 600 }}>
            Page {page} / {totalPages}
          </span>

          <button
            style={secondaryBtn}
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const headerCard = {
  background: "#ffffff",
  padding: "14px",
  borderRadius: "10px",
  boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
  marginBottom: "14px",
};

const headerRow = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  flexWrap: "wrap",
};

const selectStyle = {
  minWidth: "200px",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
  fontSize: "14px",
};

const secondaryBtn = {
  padding: "8px 14px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  background: "#F1F5F9",
  fontWeight: "600",
  cursor: "pointer",
};
