import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function SDSBilling() {
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const normalize = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ================= LOAD SHEETS ================= */
  useEffect(() => {
    api.get("/sds/sheets").then((res) => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ================= LOAD BILLING ================= */
  async function loadBilling(p = 1) {
    if (!sheet) {
      alert("Select SDS Sheet");
      return;
    }

    setLoading(true);
    setRows([]);

    try {
      const res = await api.get("/sds/list", {
        params: {
          sheet: normalize(sheet),
          page: p,
          pageSize: PAGE_SIZE,
        },
      });

      if (!res.data.ok) {
        alert("Failed to load billing data");
        return;
      }

      const mapped = (res.data.rows || []).map((r) => {
        const billingReady = r.billing?.status === "ready";
        const notPublishable = r.search?.notPublishable === true;

        return {
          referenceId: r.referenceId,
          lastWorkedBy:
            r.transcription?.user ||
            r.supersede?.user ||
            r.search?.user ||
            "-",
          billingReady,
          notPublishable,
        };
      });

      setRows(mapped);
      setTotal(res.data.total || 0);
      setPage(p);
    } catch (err) {
      console.error(err);
      alert("Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  /* ================= FILTER ================= */
  const filteredRows = rows.filter((r) => {
    if (filter === "READY") return r.billingReady;
    if (filter === "PENDING") return !r.billingReady;
    return true;
  });

  function viewWorkflow(refId) {
    navigate(`/admin/workflow/view/${normalize(sheet)}/${refId}`);
  }

  return (
    <AdminLayout>
      <h1 className="page-title">SDS Billing – Workflow Summary</h1>

      {/* CONTROLS */}
      <div className="billing-controls">
        <select value={sheet} onChange={(e) => setSheet(e.target.value)}>
          <option value="">Select SDS Sheet</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <button onClick={() => loadBilling(1)} className="primary-btn">
          Load
        </button>

        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="READY">Ready for Billing</option>
          <option value="PENDING">Yet to Complete</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        {loading ? (
          <p>Loading…</p>
        ) : filteredRows.length === 0 ? (
          <p>No records found.</p>
        ) : (
          <>
            <table className="classic-table">
              <thead>
                <tr>
                  <th>SL No</th>
                  <th>Reference ID</th>
                  <th>Last Worked By</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => (
                  <tr key={r.referenceId}>
                    <td>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{r.referenceId}</td>
                    <td>{r.lastWorkedBy}</td>

                    <td>
                      {r.billingReady ? (
                        <span className="badge ready">READY</span>
                      ) : (
                        <span className="badge pending">PENDING</span>
                      )}
                    </td>

                    <td>
                      {r.notPublishable ? (
                        <span className="badge notpub">NOT PUBLISHABLE</span>
                      ) : (
                        <span className="badge normal">PUBLISHABLE</span>
                      )}
                    </td>

                    <td>
                      <button
                        className="view-btn"
                        onClick={() => viewWorkflow(r.referenceId)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  disabled={page === 1}
                  onClick={() => loadBilling(page - 1)}
                >
                  ◀ Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page === totalPages}
                  onClick={() => loadBilling(page + 1)}
                >
                  Next ▶
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* STYLES */}
      <style>{`
        .page-title {
          font-size: 24px;
          font-weight: 700;
        }

        .billing-controls {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        select, .primary-btn {
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }

        .primary-btn {
          background: #1d4ed8;
          color: #fff;
          border: none;
          cursor: pointer;
        }

        .table-wrapper {
          margin-top: 20px;
          background: #fff;
        }

        .classic-table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          border: 1px solid #d1d5db;
          padding: 10px;
        }

        thead {
          background: #f1f5f9;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
        }

        .badge.ready {
          background: #22c55e;
          color: #fff;
        }

        .badge.pending {
          background: #ef4444;
          color: #fff;
        }

        .badge.notpub {
          background: #9333ea;
          color: #fff;
        }

        .badge.normal {
          background: #64748b;
          color: #fff;
        }

        .view-btn {
          padding: 6px 12px;
          background: #0f172a;
          color: #fff;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .pagination {
          margin-top: 14px;
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .pagination button {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid #64748b;
          background: #e2e8f0;
          font-weight: 600;
          cursor: pointer;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </AdminLayout>
  );
}
