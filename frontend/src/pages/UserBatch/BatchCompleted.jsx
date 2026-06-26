import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

export default function BatchCompleted() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    assignedCount: 0,
    pendingCount: 0,
    completedCount: 0,
    completedToday: 0,
  });
  const [sheets, setSheets] = useState([]);
  const [sheetFilter, setSheetFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const user = JSON.parse(localStorage.getItem("sarnUser")) || {};

  useEffect(() => {
    loadCompleted({});
  }, [page]); // fires on mount (page=1) and on page changes

  async function loadCompleted(opts = {}) {
    const sf = opts.sheet !== undefined ? opts.sheet : sheetFilter;
    const fd = opts.fromDate !== undefined ? opts.fromDate : fromDate;
    const td = opts.toDate !== undefined ? opts.toDate : toDate;
    const pg = opts.page !== undefined ? opts.page : page;

    setLoading(true);
    try {
      const res = await api.get("/user/batch/completed", {
        params: { userId: user.userId, fromDate: fd, toDate: td, page: pg, pageSize, sheet: sf },
      });

      if (res.data.ok) {
        setRows(res.data.rows || []);
        setSummary(res.data.summary || {});
        setTotal(res.data.pagination?.total || 0);
        setSheets(res.data.sheets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSheetChange(val) {
    setSheetFilter(val);
    setPage(1);
    loadCompleted({ sheet: val, page: 1 });
  }

  function handleSearch() {
    setPage(1);
    loadCompleted({ page: 1 });
  }

  function handleClear() {
    setFromDate("");
    setToDate("");
    setPage(1);
    loadCompleted({ fromDate: "", toDate: "", page: 1 });
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <h2 style={{ marginBottom: 4 }}>Completed Batch Records</h2>
      <p style={{ color: "#64748b", marginBottom: 20, fontSize: 14 }}>
        Filter by sheet to see counts for that sheet only.
      </p>

      {/* ── Summary Cards ── */}
      <div style={{ display: "flex", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Assigned" value={summary.assignedCount ?? 0} bg="#fff7ed" accent="#ea580c" />
        <StatCard label="Pending" value={summary.pendingCount ?? 0} bg="#fef3c7" accent="#d97706" />
        <StatCard label="Completed" value={summary.completedCount ?? 0} bg="#dcfce7" accent="#16a34a" />
        <StatCard label="Completed Today" value={summary.completedToday ?? 0} bg="#dbeafe" accent="#2563eb" />
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Sheet:</label>
        <select
          value={sheetFilter}
          onChange={e => handleSheetChange(e.target.value)}
          style={sel}
        >
          <option value="">All Sheets</option>
          {sheets.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <span style={{ color: "#cbd5e1", fontSize: 18, margin: "0 4px" }}>|</span>

        <label style={{ fontSize: 13, color: "#374151" }}>From</label>
        <input
          type="date"
          value={fromDate}
          onChange={e => setFromDate(e.target.value)}
          style={sel}
        />
        <label style={{ fontSize: 13, color: "#374151" }}>To</label>
        <input
          type="date"
          value={toDate}
          onChange={e => setToDate(e.target.value)}
          style={sel}
        />

        <button onClick={handleSearch} style={btnPrimary}>Search</button>

        {(fromDate || toDate) && (
          <button onClick={handleClear} style={btnClear}>✕ Clear</button>
        )}
      </div>

      <div style={{ marginBottom: 12, fontWeight: 600, color: "#374151" }}>
        Records Found: {total}
        {sheetFilter && <span style={{ marginLeft: 10, color: "#6b7280", fontWeight: 400, fontSize: 13 }}>— Sheet: {sheetFilter}</span>}
      </div>

      {/* ── Table ── */}
      {loading ? (
        <p style={{ color: "#64748b" }}>Loading...</p>
      ) : (
        <table border="1" width="100%" cellPadding="8" style={{ borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th>Sheet</th>
              <th>New Repository</th>
              <th>Chemical Name</th>
              <th>Manufacturer</th>
              <th>Site Name</th>
              <th>Date Verified</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.recordId}>
                <td>{row.sheet}</td>
                <td>{row.newRepository}</td>
                <td>{row.chemicalName}</td>
                <td>{row.manufacturerName}</td>
                <td>{row.siteName}</td>
                <td>{row.verifiedDate}</td>
                <td>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>Completed</span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>
                  No completed records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* ── Pagination ── */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          style={{ ...btnPrimary, opacity: page === 1 ? 0.4 : 1 }}
        >
          Previous
        </button>
        <span style={{ fontSize: 13, color: "#374151" }}>Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
          style={{ ...btnPrimary, opacity: page >= totalPages ? 0.4 : 1 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, bg, accent }) {
  return (
    <div style={{
      padding: "14px 20px",
      background: bg,
      borderRadius: 10,
      borderLeft: `4px solid ${accent}`,
      minWidth: 140,
      flex: "0 0 auto",
    }}>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>{value}</div>
    </div>
  );
}

const sel = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 13,
  color: "#0f172a",
};

const btnPrimary = {
  padding: "7px 16px",
  borderRadius: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const btnClear = {
  padding: "7px 14px",
  borderRadius: 8,
  border: "1px solid #fca5a5",
  background: "#fef2f2",
  color: "#dc2626",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};
