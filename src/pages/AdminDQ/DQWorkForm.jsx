import React, { useEffect, useState } from "react";
import UserLayout from "../../layouts/UserLayout";
import { useParams, useLocation } from "react-router-dom";
import api from "../../config/apiClient"; 

export default function DQWorkForm() {
  const { refId } = useParams();
  const loc = useLocation();
  const qs = new URLSearchParams(loc.search);

  const company = qs.get("company");
  const sheet = qs.get("sheet");
  const readOnly = qs.get("readonly") === "true";

  const [ref, setRef] = useState(null);
  const [payload, setPayload] = useState({
    completedByName: localStorage.getItem("userName") || "",
    dateVerified: "",
    issueIdentified: "",
    remarks1: "",
    status: "completed",
    billing: "",
  });

  const userId =
    JSON.parse(localStorage.getItem("sarnUser") || "{}")?.userId || "";

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!company || !sheet || !refId) return;

    api
      .get("/dq/references", {
        params: { company, sheet },
      })
      .then((res) => {
        if (!res.data.ok) return;

        const found = res.data.references.find(
          (x) => x.referenceId === refId
        );

        setRef(found || null);

        const stage = found?.currentStage || "validate";
        const existing = found?.dq?.[stage]?.data || {};

        setPayload((p) => ({ ...p, ...existing }));
      })
      .catch(() => {});
  }, [company, sheet, refId]);

  /* ================= SUBMIT ================= */
  async function submit() {
    if (!ref || readOnly) return;

    const stage = ref.currentStage || "validate";

    try {
      const res = await api.post("/dq/work", {
        company,
        sheet,
        refId,
        userId,
        stage,
        payload,
      });

      if (!res.data.ok) {
        alert(res.data.error || "Save failed");
        return;
      }

      alert("Saved successfully");
      window.history.back();
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  }

  if (!ref) {
    return (
      <UserLayout>
        <div>Loading...</div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <h1>
        {readOnly ? "View DQ Work" : "Work on"} — {refId}
      </h1>

      <div
        style={{
          background: "#fff",
          padding: 12,
          borderRadius: 8,
          maxWidth: 900,
        }}
      >
        {/* COMMON */}
        <h3>Common Fields</h3>
        <p><b>Product:</b> {ref.common?.chemicalProduct || "-"}</p>
        <p><b>Manufacturer:</b> {ref.common?.manufacturer || "-"}</p>
        <p><b>Revision Date:</b> {ref.common?.revisionDate || "-"}</p>

        {/* USER DATA */}
        <h3 style={{ marginTop: 12 }}>User Entered Data</h3>

        <Field label="Date Verified">
          <input
            type="date"
            value={payload.dateVerified}
            disabled={readOnly}
            onChange={(e) =>
              setPayload({ ...payload, dateVerified: e.target.value })
            }
          />
        </Field>

        <Field label="Issue Identified / Comment">
          <textarea
            rows={3}
            value={payload.issueIdentified}
            disabled={readOnly}
            onChange={(e) =>
              setPayload({ ...payload, issueIdentified: e.target.value })
            }
          />
        </Field>

        <Field label="Remarks">
          <textarea
            rows={2}
            value={payload.remarks1}
            disabled={readOnly}
            onChange={(e) =>
              setPayload({ ...payload, remarks1: e.target.value })
            }
          />
        </Field>

        <Field label="Status">
          <select
            value={payload.status}
            disabled={readOnly}
            onChange={(e) =>
              setPayload({ ...payload, status: e.target.value })
            }
          >
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="issue">Issue</option>
          </select>
        </Field>

        <Field label="Billing">
          <input
            value={payload.billing}
            disabled={readOnly}
            onChange={(e) =>
              setPayload({ ...payload, billing: e.target.value })
            }
          />
        </Field>

        {!readOnly && (
          <button onClick={submit} style={btn}>
            Submit
          </button>
        )}
      </div>
    </UserLayout>
  );
}

/* ================= UI HELPERS ================= */

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontWeight: 600 }}>{label}</label><br />
      {children}
    </div>
  );
}

const btn = {
  padding: "8px 14px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
