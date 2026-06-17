import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

export default function BatchBilling() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [msg, setMsg] = useState("");

  const admin =
    JSON.parse(localStorage.getItem("sarnUser")) || {};

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    if (sheet) {
      loadBillingQueue();
    }
  }, [sheet]);

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");

      if (res.data.ok) {
        setSheets(res.data.sheets || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function loadBillingQueue() {
    try {
      setLoading(true);

      const res = await api.get(
        "/admin/batch/billing",
        {
          params: { sheet },
        }
      );

      if (res.data.ok) {
        setRows(res.data.rows || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markComplete(recordId) {
    try {
      const ok = window.confirm(
        `Mark ${recordId} as billed?`
      );

      if (!ok) return;

      setMsg("Updating...");

      const res = await api.post(
        "/batch/workflow/billing",
        {
          sheet,
          recordId,
          adminId: admin.userId,
        }
      );

      if (res.data.ok) {
        setMsg("Billing completed");

        loadBillingQueue();
      }
    } catch (err) {
      console.error(err);
      setMsg("Failed");
    }
  }

  return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
    }}
  >
      <h2>Batch Billing</h2>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <select
          value={sheet}
          onChange={e =>
            setSheet(e.target.value)
          }
        >
          <option value="">
            Select Sheet
          </option>

          {sheets.map(s => (
            <option key={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            color: "#2563eb",
          }}
        >
          {msg}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          border="1"
          width="100%"
          cellPadding="8"
        >
          <thead>
            <tr
              style={{
                background: "#f1f5f9",
              }}
            >
              <th>Record ID</th>

              <th>Chemical Name</th>

              <th>Manufacturer</th>

              <th>Site Name</th>

              <th>Verified By</th>

              <th>Date Verified</th>

              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(row => (
              <tr key={row.recordId}>
                <td>{row.recordId}</td>

                <td>
                  {row.common?.chemicalName}
                </td>

                <td>
                  {
                    row.common
                      ?.manufacturerName
                  }
                </td>

                <td>
                  {row.common?.siteName}
                </td>

                <td>
                  {
                    row.verification
                      ?.verifiedBy
                  }
                </td>

                <td>
                  {
                    row.verification
                      ?.dateVerified
                  }
                </td>

                <td>
                  <button
                    onClick={() =>
                      markComplete(
                        row.recordId
                      )
                    }
                    style={{
                      padding:
                        "6px 12px",
                      background:
                        "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Mark Billed
                  </button>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  style={{
                    textAlign:
                      "center",
                  }}
                >
                  No Billing Records
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}