import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import UserLayout from "../../layouts/UserLayout";
import api from "../../config/apiClient";

/* ================= DATA QUEUE COMMENTS ================= */

const DATA_QUEUE_COMMENTS = [
  "Change in Product Name",
  "Change in Product Code",
  "Change in Country",
  "Archived through URL method",
  "Not able to view",
  "Non-English SDS",
  "Worked through URL method",
  "Not an SDS (Article)",
  "Discontinued",
  "Dashboard chemical name and repository chemical name not matching",
  "Change in manufacturer name",
  "Duplicate in other site",
  "Wrong PDF attached",
  "Searched and attached",
  "Not processed since there is no confirmation from manufacturer",
  "PDF Not attached in the Repository",
  "Not an SDS (TDS/PDS)",
  "Incomplete SDS",
  "Manufacturer details not available",
  "English SDS",
  "Noneditable Files",
  "Poor Quality SDS",
  "Test file",
  "Processed as Problem identified SDS",
  "Language updated as per the attachment",
];

export default function DQWorkForm() {
  const { refId } = useParams();
  const [query] = useSearchParams();
  const navigate = useNavigate();

  const sheet = query.get("sheet");

  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    dateVerified: "",
    issueIdentified: "",
    remarks: "",
  });

  /* ================= LOAD ASSIGNED DQ WORK ================= */
  useEffect(() => {
    if (!sheet || !refId || !userId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await api.get("/user/dq/workflow", {
          params: { sheet, repoId: refId, userId },
        });

        if (res.data.ok) {
          const r = res.data.reference;
          setRepo(r);

          setForm({
            dateVerified: r.dq?.transcription?.data?.dateVerified || "",
            issueIdentified:
              r.dq?.transcription?.data?.issueIdentified || "",
            remarks: r.dq?.transcription?.data?.remarks1 || "",
          });
        } else {
          setRepo(null);
        }
      } catch (err) {
        console.error("DQ WORK LOAD ERROR:", err);
        setRepo(null);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sheet, refId, userId]);

  function updateField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /* ================= SUBMIT USER WORK ================= */
  async function submitForm() {
    if (!sheet || !refId || !userId) {
      alert("Session expired. Please login again.");
      return;
    }

 
    if (!form.dateVerified) {
      alert("Date Verified is required");
      return;
    }

    if (submitting) return;

    try {
      setSubmitting(true);

      const res = await api.post("/dq/update", {
          sheet,
          repoId: refId,
          updates: {
            assignedTo: userId,
            dateVerified: form.dateVerified,
            issueIdentified: form.issueIdentified,
            remarks: form.remarks,
          },
        });


      if (!res.data.ok) {
        alert(res.data.error || "Save failed");
        return;
      }

      alert("✅ DQ work submitted successfully");
      navigate("/user/dq/tasks", { replace: true });

    } catch (err) {
      console.error("DQ SUBMIT ERROR:", err);
      alert("❌ Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ================= STATES ================= */

  if (loading) {
    return (
      <UserLayout>
        <h2>Loading DQ work…</h2>
      </UserLayout>
    );
  }

  if (!repo) {
    return (
      <UserLayout>
        <h2>Assigned DQ work not found</h2>
        <button onClick={() => navigate("/user/dq/tasks")}>← Back</button>
      </UserLayout>
    );
  }

  const c = repo.common || {};

  return (
    <UserLayout>
      <div style={{ padding: 24 }}>
        <h1>DQ Work — Repo {refId}</h1>

        <div style={box}>
          {/* ================= COMMON FIELDS ================= */}
          <h3>Common Fields</h3>

          <div className="grid-2">
            <ReadField label="SDS #" value={c.sdsNumber} />
            <ReadField label="Chemical Product" value={c.chemicalProduct} />
            <ReadField label="Manufacturer" value={c.manufacturer} />
            <ReadField label="Revision Date" value={c.revisionDate} />
            <ReadField label="Language" value={c.language} />
            <ReadField label="SDS Status" value={c.sdsStatus} />
            <ReadField label="Last Updated Date" value={c.lastUpdatedDate} />
            <ReadField label="Days in Queue" value={c.daysInQueue} />
          </div>

          <div className="grid-1">
            <ReadField label="Sites In Use" value={c.sitesInUse} />
            <ReadField label="Supersede" value={c.supersede} />
          </div>

          <hr style={{ margin: "24px 0" }} />

          {/* ================= USER WORK ================= */}
          <h3>User Work</h3>

          <div className="grid-2">
            <ReadField label="Sheet" value={sheet} />
            <ReadField label="Repo ID" value={refId} />
          </div>

          <div className="grid-2">
            <ReadField label="Completed By" value={userId} />
            <InputField
              label="Date Verified *"
              type="date"
              value={form.dateVerified}
              onChange={(v) => updateField("dateVerified", v)}
            />
          </div>

          {/* ===== OPTIONAL DROPDOWN ===== */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              Issue Identified / Comment
            </label>
            <select
              value={form.issueIdentified}
              onChange={(e) =>
                updateField("issueIdentified", e.target.value)
              }
              style={input}
            >
              <option value="">Select comment (optional)</option>
              {DATA_QUEUE_COMMENTS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <TextAreaField
            label="Remarks (Optional)"
            value={form.remarks}
            onChange={(v) => updateField("remarks", v)}
          />

          <button
            onClick={submitForm}
            style={submitBtn}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>

        <style>{`
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-bottom: 16px;
          }
          .grid-1 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 18px;
            margin-bottom: 16px;
          }
        `}</style>
      </div>
    </UserLayout>
  );
}

/* ================= FIELD COMPONENTS ================= */

function ReadField({ label, value }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value || ""} readOnly style={readInput} />
    </div>
  );
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={textarea}
      />
    </div>
  );
}

/* ================= STYLES ================= */

const box = {
  background: "#fff",
  padding: 24,
  borderRadius: 12,
  maxWidth: "1100px",
};

const labelStyle = {
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: "block",
};

const readInput = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ddd",
  background: "#f3f4f6",
};

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const textarea = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  height: 90,
  border: "1px solid #ccc",
};

const submitBtn = {
  marginTop: 10,
  padding: "10px 22px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
};
