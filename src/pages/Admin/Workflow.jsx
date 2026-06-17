import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function Workflow() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  /* LOAD SHEETS */
  useEffect(() => {
    api
      .get("/sds/sheets")
      .then((res) => {
        if (res.data.ok) setSheets(res.data.sheets || []);
      })
      .catch(() => setSheets([]));
  }, []);

  /* LOAD WORKFLOW */
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
        },
      })
      .then((res) => {
        const d = res.data;
        if (d.ok) {
          setRows(d.rows || []);
          setTotal(d.total || 0);
        } else {
          setRows([]);
          setMsg("Failed to load workflow");
        }
      })
      .catch(() => {
        setRows([]);
        setMsg("Server error");
      })
      .finally(() => setLoading(false));
  }, [sheet, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* STAGE BADGE */
  const stageBadge = (stage) => {
    const colors = {
      search: "#c7d2fe",
      supersede: "#fde68a",
      transcription: "#fca5a5",
      billing: "#86efac",
    };
    return (
      <span
        style={{
          background: colors[stage] || "#e5e7eb",
          padding: "4px 10px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 12,
          textTransform: "uppercase",
        }}
      >
        {stage}
      </span>
    );
  };

  return (
    <AdminLayout>
      <h1>SDS Workflow Control</h1>

      {/* SHEET SELECT */}
      <div style={{ marginBottom: 15 }}>
        <label>
          <b>Select SDS Sheet</b>
        </label>
        <select
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            setPage(1);
          }}
          style={input}
        >
          <option value="">-- Select Sheet --</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading…</p>}
      {msg && <p style={{ color: "red" }}>{msg}</p>}

      {/* TABLE */}
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
            {rows.map((r, i) => {
              const stage = r.currentStage;
              const assignedTo = r?.[stage]?.assignedTo || "-";
              const status = r?.[stage]?.status || "waiting";

              return (
                <tr key={r.referenceId}>
                  <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                  <td>{r.referenceId}</td>
                  <td>{stageBadge(stage)}</td>
                  <td>{assignedTo}</td>
                  <td>
                    <span
                      style={{
                        background:
                          status === "pending"
                            ? "#fde68a"
                            : status === "completed"
                            ? "#4ade80"
                            : "#e5e7eb",
                        padding: "4px 10px",
                        borderRadius: 12,
                        fontWeight: 700,
                      }}
                    >
                      {status}
                    </span>
                  </td>
                  <td>
                    <button
                      style={viewBtn}
                      onClick={() =>
                        navigate(
                          `/admin/workflow/view/${sheet}/${r.referenceId}`
                        )
                      }
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* PAGINATION */}
      {rows.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Prev
          </button>
          <span style={{ margin: "0 10px" }}>
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </AdminLayout>
  );
}

/* STYLES */
const input = { padding: 8, marginTop: 6, width: 260 };
const viewBtn = {
  padding: "6px 10px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
