  // src/pages/SuperAdmin/AttendancePage.jsx

  import React, { useEffect, useState } from "react";
  import SuperAdminSidebar from "../../components/SuperAdminSidebar";
import api from "../../config/apiClient";

  const WORKING_MINUTES = 420; // 7 hrs

  export default function AttendancePage() {
    const [rows, setRows] = useState([]);
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [date, setDate] = useState("");
    const [month, setMonth] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
      loadAttendance();
    }, []);

    async function loadAttendance(params = {}) {
      try {
        const query = new URLSearchParams(params).toString();
        const res = await api.get(`/super-admin/attendance?${query}`);
const data = res.data;


        if (!data.ok) {
          setError("Failed to load attendance");
          return;
        }

        setRows(data.rows || []);
      } catch {
        setError("Server error");
      }
    }

    function applyFilters() {
      const params = {};
      if (date) params.date = date;
      if (month) params.month = month;
      loadAttendance(params);
    }

    const filtered =
      roleFilter === "ALL"
        ? rows
        : rows.filter(r => r.role?.toUpperCase() === roleFilter);

    return (
      <>
        <SuperAdminSidebar />

        <div style={{ marginLeft: 240, padding: 30 }}>
          <h2 style={{ marginBottom: 12 }}>Attendance Report</h2>

          {/* FILTER BAR */}
          <div style={filterBar}>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="ALL">All Roles</option>
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>

            <input
              type="date"
              value={date}
              onChange={e => {
                setDate(e.target.value);
                setMonth("");
              }}
            />

            <input
              type="month"
              value={month}
              onChange={e => {
                setMonth(e.target.value);
                setDate("");
              }}
            />

            <button onClick={applyFilters} style={applyBtn}>
              Apply
            </button>
          </div>

          {error && <p style={{ color: "red" }}>{error}</p>}

          {/* TABLE */}
          <table
            border="1"
            width="100%"
            cellPadding="8"
            cellSpacing="0"
            style={table}
          >
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th>Employee Name</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Date</th>
                <th>Sessions</th>
                <th>Worked</th>
                <th>Expected</th>
                <th>Remaining</th>
                <th>Efficiency</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="10" align="center">
                    No attendance data
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const workedHrs = (r.totalMinutes / 60).toFixed(2);
                  const remaining =
                    Math.max(0, WORKING_MINUTES - r.totalMinutes) / 60;
                  const efficiency = Math.min(
                    100,
                    Math.round((r.totalMinutes / WORKING_MINUTES) * 100)
                  );

                  const badge = efficiencyStyle(efficiency);

                  return (
                    <tr key={i}>
                      <td>{r.name || "-"}</td>
                      <td align="center">{r.userId}</td>
                      <td align="center">{r.role}</td>
                      <td align="center">{r.date}</td>
                      <td align="center">{r.sessions?.length || 0}</td>
                      <td align="center">{workedHrs} hrs</td>
                      <td align="center">7 hrs</td>
                      <td align="center">
                        {r.status === "COMPLETED"
                          ? "-"
                          : remaining.toFixed(2) + " hrs"}
                      </td>
                      <td align="center">
                        <span
                          style={{
                            background: badge.bg,
                            color: "white",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontWeight: 600,
                          }}
                        >
                          {efficiency}%
                        </span>
                      </td>
                      <td align="center">
                        {r.status === "COMPLETED" ? "Completed" : "In Progress"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  /* ================= HELPERS ================= */

  function efficiencyStyle(percent) {
    if (percent < 50) return { bg: "#ef4444" }; // red
    if (percent < 75) return { bg: "#f59e0b" }; // amber
    if (percent < 100) return { bg: "#3b82f6" }; // blue
    return { bg: "#22c55e" }; // green
  }

  const filterBar = {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  };

  const applyBtn = {
    background: "#2563eb",
    color: "white",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    cursor: "pointer",
  };

  const table = {
    borderCollapse: "collapse",
    background: "#ffffff",
  };
