import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

const fix = (s) =>
  String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

export default function References() {
  const navigate = useNavigate();

  const [company] = useState("SARN");
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [stats, setStats] = useState(null);
  const [userId, setUserId] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ---------------- LOAD SDS SHEETS ---------------- */
  useEffect(() => {
    api.get("/sds/sheets").then((res) => {
      if (res.data.ok && Array.isArray(res.data.sheets)) {
        setSheets(res.data.sheets);
      }
    });
  }, []);

  /* ---------------- LOAD REFERENCES ---------------- */
  async function loadReferences(selectedSheet, p = 1) {
    if (!selectedSheet) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.get("/sds/list", {
        params: {
          sheet: fix(selectedSheet),
          page: p,
          pageSize: PAGE_SIZE,
        },
      });

      const data = res.data;

      if (!data.ok) {
        setRows([]);
        setTotal(0);
        setError(data.error || "Failed to load references");
      } else {
        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPage(p);
      }
    } catch {
      setError("Backend connection failed");
    }

    setLoading(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------------- WORKFLOW STATUS ---------------- */
  function getWorkflowStatus(ref) {
    const s = ref.search?.status || "pending";
    const sp = ref.supersede?.status || "waiting";
    const t = ref.transcription?.status || "waiting";
    const b = ref.billing?.status || "waiting";

    if (s === "pending") return { text: "Not Started", color: "#e5e7eb" };
    if (s === "completed" && sp === "waiting")
      return { text: "Awaiting Supersede", color: "#fde68a" };
    if (sp === "completed" && t === "waiting")
      return { text: "Awaiting Transcription", color: "#c7d2fe" };
    if (t === "completed" && b === "waiting")
      return { text: "Awaiting Billing", color: "#fca5a5" };
    if (b === "completed")
      return { text: "Completed", color: "#4ade80" };

    return { text: "In Progress", color: "#e5e7eb" };
  }
async function loadProductivity() {
  if (!sheet || !fromDate || !toDate) {
    alert("Select sheet and date range");
    return;
  }

  try {
    const res = await api.get(
      "/admin/workflow/productivity",
      {
        params: {
          sheet: fix(sheet),
          fromDate,
          toDate,
        },
      }
    );

    if (res.data.ok) {
      setStats(res.data);
    }
  } catch (err) {
    console.error(err);
  }
}
async function loadProductivity() {
  if (!sheet || !fromDate || !toDate) {
    alert("Select Sheet, From Date and To Date");
    return;
  }

  try {
    const res = await api.get(
      "/admin/workflow/productivity",
      {
        params: {
          sheet: fix(sheet),
          fromDate,
          toDate,
        },
      }
    );

    if (res.data.ok) {
      setStats(res.data);
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load report");
  }
}
  function openDetails(refId) {
    navigate("/admin/workflow-details", {
      state: {
        referenceId: refId,
        company,
        sheet: fix(sheet),
      },
    });
  }

  return (
    <AdminLayout>
      <h2>SDS Reference List</h2>

      {/* SHEET DROPDOWN */}
      <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "end",
    marginBottom: 15,
    flexWrap: "wrap",
  }}
>
        <label><b>Select SDS Sheet</b></label>
        <select
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            loadReferences(e.target.value, 1);
          }}
          style={input}
        >
          <option value="">-- Select Sheet --</option>
          {sheets.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
  <label><b>From Date</b></label>
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    style={input}
  />
</div>

<div>
  <label><b>To Date</b></label>
  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    style={input}
  />
</div>

<button
  onClick={loadProductivity}
  style={{
    padding: "10px 16px",
    height: 40,
  }}
>
  Load Report
</button>

      {loading && <p>Loading...</p>}
      {stats && (
  <div
    style={{
      display: "flex",
      gap: 20,
      marginBottom: 20,
      flexWrap: "wrap",
    }}
  >
    <div><b>Total Records:</b> {stats.summary.totalRecords}</div>

    <div><b>Assigned:</b> {stats.summary.assignedRecords}</div>

    <div><b>Completed:</b> {stats.summary.completedRecords}</div>

    <div><b>Head Count:</b> {stats.summary.headCount}</div>
  </div>
)}  
      {error && <p style={{ color: "red" }}>{error}</p>}

      {stats?.users?.length > 0 && (
  <>
    <h3>User Productivity</h3>

    <table style={table}>
      <thead>
        <tr>
          <th style={th}>User</th>
          <th style={th}>Assigned</th>
          <th style={th}>Completed</th>
          <th style={th}>Pending</th>
          <th style={th}>Completion %</th>
        </tr>
      </thead>

      <tbody>
        {stats.users.map((u) => (
          <tr key={u.userId}>
            <td style={td}>{u.userId}</td>
            <td style={td}>{u.assigned}</td>
            <td style={td}>{u.completed}</td>
            <td style={td}>{u.pending}</td>
            <td style={td}>
              {u.assigned
                ? (
                    (u.completed / u.assigned) *
                    100
                  ).toFixed(2)
                : 0}
              %
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <br />
  </>
)}

      {/* TABLE */}
      {rows.length > 0 && (
        <>
          <table style={table}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={th}>SL No</th>
                <th style={th}>Reference ID</th>
                <th style={th}>Business Entity</th>
                <th style={th}>Repository</th>
                <th style={th}>Workflow Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((ref, index) => {
                const status = getWorkflowStatus(ref);
                const refId = ref.referenceId || ref.refId;

                return (
                  <tr
                    key={`${sheet}-${refId}`}
                    onClick={() => openDetails(refId)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={td}>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td style={td}>{refId}</td>
                    <td style={td}>{ref.common?.businessEntity || "-"}</td>
                    <td style={td}>{ref.common?.repositoryNumber || "-"}</td>
                    <td style={td}>
                      <span
                        style={{
                          background: status.color,
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {status.text}
                      </span>
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
              onClick={() => loadReferences(sheet, page - 1)}
            >
              Prev
            </button>
            <span style={{ margin: "0 10px" }}>
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => loadReferences(sheet, page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {!loading && sheet && rows.length === 0 && !error && (
        <p>No references found for this sheet.</p>
      )}
    </AdminLayout>
  );
}

/* ---------------- STYLES ---------------- */

const input = {
  display: "block",
  padding: "8px",
  marginTop: 6,
  width: 260,
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  border: "1px solid #ddd",
  padding: 8,
  fontWeight: "bold",
};

const td = {
  border: "1px solid #ddd",
  padding: 8,
};
