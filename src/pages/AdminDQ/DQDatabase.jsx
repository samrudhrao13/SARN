import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function DQDatabase() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [msg, setMsg] = useState("");

  /* ================= LOAD DQ SHEETS ================= */
  useEffect(() => {
    api.get("/dq/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ================= LOAD DATABASE ================= */
  useEffect(() => {
    if (!sheet) return;

    setMsg("Loading...");

    api
      .get("/dq/list", {
        params: {
          sheet,
          page,
          pageSize: PAGE_SIZE,
          search,
          filter,
        },
      })
      .then(res => {
        if (res.data.ok) {
          setRows(res.data.rows || []);
          setTotal(res.data.total || 0);
          setMsg("");
        } else {
          setRows([]);
          setMsg("No records found");
        }
      })
      .catch(() => {
        setRows([]);
        setMsg("Server error");
      });
  }, [sheet, page, search, filter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const exportExcel = () => {
    if (!sheet) return;
    window.open(
      `${api.defaults.baseURL}/dq/export?sheet=${sheet}`,
      "_blank"
    );
  };

  return (
    <AdminLayout>
      <h1 style={{ marginBottom: 14 }}>📂 DQ Database</h1>

      {/* HEADER CONTROLS */}
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

          <input
            placeholder="🔍 Search Repo ID"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
          />

          <select
            value={filter}
            onChange={e => {
              setFilter(e.target.value);
              setPage(1);
            }}
            style={selectStyle}
          >
            <option value="ALL">All</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNASSIGNED">Unassigned</option>
            <option value="READY">Billing Ready</option>
          </select>

          <button style={primaryBtn} onClick={exportExcel}>
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {msg && <p>{msg}</p>}

      {/* TABLE */}
      <table border="1" width="100%" cellPadding="8" style={table}>
        <thead>
          <tr>
            <th>SL No</th>
            <th>Repo ID</th>
            <th>Assigned To</th>
            <th>Stage</th>
            <th>Status</th>
            <th>Billing</th>
            <th>View</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="7" align="center">No data</td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.repoId}>
                <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>{r.repoId}</td>
                <td>{r.assignedTo || "-"}</td>

                <td>
                  <span style={stagePill(r.stage)}>
                    {r.stage || "transcription"}
                  </span>
                </td>

                <td>
                  {r.locked ? (
                    <span style={assigned}>ASSIGNED</span>
                  ) : (
                    <span style={unassigned}>UNASSIGNED</span>
                  )}
                </td>

                <td>
                  {r.billingReady ? (
                    <span style={ready}>READY</span>
                  ) : (
                    <span style={notReady}>NOT READY</span>
                  )}
                </td>

                <td>
                  <button
                    onClick={() =>
                      navigate(`/admin/dq/view/${r.repoId}?sheet=${sheet}`)
                    }
                  >
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <div style={pagination}>
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
          Prev
        </button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
          Next
        </button>
      </div>
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
};

const inputStyle = {
  minWidth: "220px",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
};

const primaryBtn = {
  padding: "9px 16px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg,#2563EB,#1E40AF)",
  color: "#fff",
  fontWeight: "600",
  cursor: "pointer",
};

const table = { background: "#fff", borderCollapse: "collapse" };

const pagination = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  alignItems: "center",
};

const pillBase = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 8,
  fontWeight: "bold",
  fontSize: 13,
};

const assigned = { ...pillBase, background: "#fde68a" };
const unassigned = { ...pillBase, background: "#e5e7eb" };
const ready = { ...pillBase, background: "#4ade80" };
const notReady = { ...pillBase, background: "#fca5a5" };

const stagePill = (stage) => ({
  ...pillBase,
  background:
    stage === "billing" ? "#fecaca" :
    stage === "force_billed" ? "#a5f3fc" :
    "#c7d2fe",
});
