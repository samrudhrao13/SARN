import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

/* ================= HELPERS ================= */

function isPdfUrl(v) {
  return (
    typeof v === "string" &&
    (v.toLowerCase().endsWith(".pdf") || v.includes("alt=media"))
  );
}

/* ================= SAFE RENDER ================= */
function safeValue(v) {
  if (v === null || v === undefined) return "-";

  if (v?._seconds) {
    return new Date(v._seconds * 1000).toLocaleString();
  }

  if (typeof v === "object") {
    return JSON.stringify(v);
  }

  return String(v);
}

export default function WorkflowDetails() {
  const navigate = useNavigate();
  const { sheet, referenceId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!sheet || !referenceId) {
    return (
      <AdminLayout>
        <h2 style={{ color: "red" }}>
          Invalid URL. Open workflow from Admin panel.
        </h2>
      </AdminLayout>
    );
  }

  /* ================= FETCH ================= */
  useEffect(() => {
    setLoading(true);

    api
      .get("/workflow/details", {
        params: { sheet, refId: referenceId },
      })
      .then((res) => {
        if (res.data.ok) setData(res.data.workflow);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sheet, referenceId]);

  if (loading) {
    return (
      <AdminLayout>
        <h2>Loading workflow...</h2>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <h2 style={{ color: "red" }}>Workflow not found.</h2>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <button onClick={() => navigate(-1)} style={backBtn}>
        ← Back
      </button>

      <h1>Workflow Details</h1>
      <p>
        <b>Sheet:</b> {sheet} &nbsp; | &nbsp;
        <b>Reference:</b> {referenceId}
      </p>

      <Block title="Common Fields">
        <KeyValueTable
          data={{
            ...data.common,

            newRepositoryNumber:
              data.supersede?.newRepositoryNumber || "",

            supersedeVerifiedDate:
              data.supersede?.verifiedDate || "",

            transcriptionVerifiedDate:
              data.transcription?.verifiedDate || "",
          }}
        />
      </Block>

      <StageView title="Search" data={data.search} />
      <StageView title="Supersede" data={data.supersede} />
      <StageView title="Transcription" data={data.transcription} />

      <Block title="Billing">
        {data.billing?.status === "ready" ? (
          <StatusChip text="READY FOR BILLING" color="#4ade80" />
        ) : (
          <StatusChip text="NOT READY" color="#fde68a" />
        )}
      </Block>
    </AdminLayout>
  );
}

/* ================= STAGE VIEW ================= */

function StageView({ title, data }) {
  if (!data) {
    return (
      <Block title={title}>
        <StatusChip text="NOT STARTED" color="#e5e7eb" />
      </Block>
    );
  }

  if (data.status === "skipped") {
    return (
      <Block title={title}>
        <StatusChip text="SKIPPED" color="#facc15" />
        <p>
          <b>Reason:</b> {safeValue(data.reason)}
        </p>
        <p>
          <b>User:</b> {safeValue(data.user)}
        </p>
      </Block>
    );
  }

  return (
    <Block title={title}>
      <KeyValueTable data={data} />
      <p style={{ marginTop: 10 }}>
        <b>Completed By:</b> {safeValue(data.user)}
      </p>
    </Block>
  );
}

/* ================= TABLE ================= */

function KeyValueTable({ data }) {
  if (!data) return <p>-</p>;

  return (
    <table style={table}>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <td style={tdKey}>{format(k)}</td>
            <td style={tdVal}>
              {isPdfUrl(v) ? (
                <a
                  href={v}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={downloadBtn}
                >
                  ⬇ Download PDF
                </a>
              ) : (
                safeValue(v)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function format(str) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ================= UI ================= */

function Block({ title, children }) {
  return (
    <div style={card}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function StatusChip({ text, color }) {
  return (
    <span
      style={{
        background: color,
        padding: "4px 12px",
        borderRadius: 12,
        fontWeight: 700,
        fontSize: 12,
        display: "inline-block",
      }}
    >
      {text}
    </span>
  );
}

/* ================= STYLES ================= */

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 8,
  marginBottom: 20,
  border: "1px solid #e5e7eb",
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const tdKey = {
  width: "35%",
  padding: 8,
  border: "1px solid #ddd",
  fontWeight: 600,
  background: "#f8fafc",
};

const tdVal = {
  padding: 8,
  border: "1px solid #ddd",
};

const downloadBtn = {
  display: "inline-block",
  padding: "6px 12px",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 6,
  fontWeight: 600,
  textDecoration: "none",
};

const backBtn = {
  marginBottom: 15,
  padding: "6px 12px",
};
