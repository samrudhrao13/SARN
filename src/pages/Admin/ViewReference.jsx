import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

/* ---------------- HELPERS ---------------- */
const safeVal = (v) => {
  if (v === null || v === undefined) return "-";
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleString();
  if (typeof v === "object") return JSON.stringify(v, null, 2);
  return String(v);
};

export default function ViewReference() {
  const navigate = useNavigate();
  const { sheet, referenceId } = useParams();

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------------- LOAD WORKFLOW ---------------- */
  useEffect(() => {
    if (!sheet || !referenceId) {
      setLoading(false);
      return;
    }

    api
      .get("/workflow/details", {
        params: {
          sheet,
          refId: referenceId,
        },
      })
      .then((res) => {
        if (res.data.ok) setWorkflow(res.data.workflow);
        else setWorkflow(null);
      })
      .catch(() => setWorkflow(null))
      .finally(() => setLoading(false));
  }, [sheet, referenceId]);

  return (
    <AdminLayout>
      <div style={{ padding: 20 }}>
        <button onClick={() => navigate(-1)} style={backBtn}>
          ← Back
        </button>

        <h1>Reference Details</h1>
        <p>
          <b>Company:</b> SARN &nbsp;|&nbsp;
          <b>Sheet:</b> {sheet} &nbsp;|&nbsp;
          <b>Reference ID:</b> {referenceId}
        </p>

        {loading && <p>Loading...</p>}

        {!loading && !workflow && (
          <p style={{ color: "red" }}>Reference not found.</p>
        )}

        {workflow && (
          <div style={box}>
            <Section title="Common Fields" data={workflow.common} />
            <Section title="Search" data={workflow.search} />
            <Section title="Supersede" data={workflow.supersede} />
            <Section title="Transcription" data={workflow.transcription} />
            <Section title="Billing" data={workflow.billing} />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/* ---------------- SECTION ---------------- */
function Section({ title, data }) {
  return (
    <div style={{ marginBottom: 25 }}>
      <h2>{title}</h2>
      <table style={table}>
        <tbody>
          {Object.entries(data || {}).map(([k, v]) => (
            <tr key={k}>
              <td style={key}>{k}</td>
              <td style={val}>{safeVal(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const backBtn = {
  padding: "8px 14px",
  background: "#111",
  color: "#fff",
  borderRadius: 6,
  marginBottom: 20,
  border: "none",
};

const box = {
  padding: 20,
  background: "#f4f4f4",
  borderRadius: 6,
  marginTop: 20,
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const key = {
  width: "30%",
  padding: 8,
  border: "1px solid #ddd",
  fontWeight: 700,
  background: "#f9fafb",
};

const val = {
  padding: 8,
  border: "1px solid #ddd",
};
