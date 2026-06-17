import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function SDSDatabase() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* ---------------- LOAD SDS SHEETS ---------------- */
  useEffect(() => {
    api.get("/sds/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ---------------- LOAD DATA ---------------- */
  useEffect(() => {
    if (!sheet) return;

    setLoading(true);
    setMsg("");

    api
      .get("/sds/list", {
        params: {
          sheet,
          page,
          pageSize: PAGE_SIZE,
          search,
          filter,
        },
      })
      .then(res => {
        const data = res.data;
        if (data.ok) {
          setRows(data.rows || []);
          setTotal(data.total || 0);
        } else {
          setRows([]);
          setMsg("Failed to load data");
        }
      })
      .catch(() => {
        setRows([]);
        setMsg("Server error");
      })
      .finally(() => setLoading(false));
  }, [sheet, page, search, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------------- EXPORT ---------------- */
  const exportExcel = () => {
    window.open(
      `${api.defaults.baseURL}/admin/sds/database/export?sheet=${sheet}`,
      "_blank"
    );
  };

  return (
    <AdminLayout>
      <h1>SDS Database</h1>

      {/* -------- FILTER BAR -------- */}
      <div style={toolbar}>
        <select
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            setPage(1);
          }}
          style={input}
        >
          <option value="">Select SDS Sheet</option>
          {sheets.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <input
          placeholder="Search Reference ID"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={input}
        />

        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          style={input}
        >
          <option value="ALL">All</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
        </select>

        <button style={greenBtn} onClick={exportExcel}>
          Export Excel
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {msg && <p style={{ color: "red" }}>{msg}</p>}

      {/* -------- TABLE -------- */}
      {!loading && rows.length > 0 && (
        <table border="1" width="100%" cellPadding="6">
          <thead>
            <tr>
              <th>SL No</th>
              <th>Reference ID</th>
              <th>Stage</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.referenceId}>
                <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>{r.referenceId}</td>
                <td>{stageChip(r.currentStage)}</td>
                <td>{r.assignedTo || "-"}</td>
                <td>
                  {r.locked ? (
                    <span style={assigned}>Assigned</span>
                  ) : (
                    <span style={unassigned}>Unassigned</span>
                  )}
                </td>
                <td>
                  <button
                    style={viewBtn}
                    onClick={() =>
                      navigate(`/admin/workflow/view/${sheet}/${r.referenceId}`)
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* -------- PAGINATION -------- */}
      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            Prev
          </button>
          <span style={{ margin: "0 10px" }}>
            Page {page} / {totalPages}
          </span>
          <button
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

/* ---------------- STYLES ---------------- */

const toolbar = {
  display: "flex",
  gap: 10,
  marginBottom: 15,
  flexWrap: "wrap",
};

const input = {
  padding: 8,
  borderRadius: 6,
  border: "1px solid #ccc",
};

const greenBtn = {
  padding: "8px 14px",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

const assigned = {
  background: "#4ade80",
  padding: "4px 10px",
  borderRadius: 12,
  fontWeight: 700,
};

const unassigned = {
  background: "#fca5a5",
  padding: "4px 10px",
  borderRadius: 12,
  fontWeight: 700,
};

const viewBtn = {
  padding: "6px 10px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 6,
};

function stageChip(stage) {
  const colors = {
    search: "#bae6fd",
    supersede: "#fde68a",
    transcription: "#c7d2fe",
    billing: "#fca5a5",
    completed: "#4ade80",
  };

  return (
    <span
      style={{
        background: colors[stage] || "#e5e7eb",
        padding: "4px 12px",
        borderRadius: 14,
        fontWeight: 700,
        fontSize: 12,
        textTransform: "uppercase",
      }}
    >
      {stage}
    </span>
  );
}
