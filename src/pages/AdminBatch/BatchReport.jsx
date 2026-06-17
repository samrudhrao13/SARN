import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

export default function BatchReport() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [stats, setStats] = useState({
    total: 0,
    assigned: 0,
    billingReady: 0,
    completed: 0,
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSheets();
  }, []);

  useEffect(() => {
    if (sheet) {
      loadReport();
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

  async function loadReport() {
    try {
      setLoading(true);

      const res = await api.get(
        "/admin/batch/list",
        {
          params: { sheet },
        }
      );

      if (!res.data.ok) return;

      const rows = res.data.rows || [];

      const total = rows.length;

      const assigned = rows.filter(
        r => r.assignedTo
      ).length;

      const billingReady = rows.filter(
        r =>
          r.status === "Billing Ready" ||
          r.status === "BILLING_READY"
      ).length;

      const completed = rows.filter(
        r =>
          r.status === "Completed" ||
          r.status === "COMPLETED"
      ).length;

      setStats({
        total,
        assigned,
        billingReady,
        completed,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function exportReport() {
    if (!sheet) {
      alert("Select Sheet");
      return;
    }

    try {
      const response = await api.get(
        "/admin/batch/export",
        {
          params: { sheet },
          responseType: "blob",
        }
      );

      const url =
        window.URL.createObjectURL(
          new Blob([response.data])
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.setAttribute(
        "download",
        `${sheet}_BATCH_REPORT.xlsx`
      );

      document.body.appendChild(link);

      link.click();

      link.remove();
    } catch (err) {
      console.error(err);
      alert("Export failed");
    }
  }

  return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
      minHeight: "100vh",
    }}
  >
      <h2>Batch Reports</h2>

      <div
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 10,
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

          {sheets.map(sheet => (
            <option
              key={sheet}
              value={sheet}
            >
              {sheet}
            </option>
          ))}
        </select>

        <button
          onClick={exportReport}
          disabled={!sheet}
        >
          Export Report
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4,1fr)",
              gap: 20,
            }}
          >
            <Card
              title="Total Records"
              value={stats.total}
            />

            <Card
              title="Assigned"
              value={stats.assigned}
            />

            <Card
              title="Billing Ready"
              value={stats.billingReady}
            />

            <Card
              title="Completed"
              value={stats.completed}
            />
          </div>

          <div
            style={{
              marginTop: 30,
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              border:
                "1px solid #e5e7eb",
            }}
          >
            <h3>Summary</h3>

            <p>
              Total Records:
              {" "}
              <strong>
                {stats.total}
              </strong>
            </p>

            <p>
              Assigned:
              {" "}
              <strong>
                {stats.assigned}
              </strong>
            </p>

            <p>
              Billing Ready:
              {" "}
              <strong>
                {stats.billingReady}
              </strong>
            </p>

            <p>
              Completed:
              {" "}
              <strong>
                {stats.completed}
              </strong>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#64748b",
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginTop: 10,
        }}
      >
        {value}
      </div>
    </div>
  );
}