import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const issueOptions = [
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
  "Noneditable Records",
  "Processed as Problem Identified",
  "Transcribed as per SDS attached",
  "No Repository Number",
  "Unique Number",
  "Already Worked",
  "Archived SDS is an English SDS, but active SDS is a non-English SDS",
];

const remarks1Options = [
  "As per SOP we do not consider Percent Volatile, hence not made any changes",
  "Limited Characters not fitting in the text box",
  "As per SOP we do not consider Percent Volatile, hence not made any changes and Limited Characters not fitting in the text box",
];

export default function BatchWorkflow() {
  const { sheet, recordId } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("sarnUser")) || {};

  const [loading, setLoading] = useState(true);
  const [workflow, setWorkflow] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    dateVerified: "",
    issueIdentified: "",
    remarks1: "",
    remarks2: "",
    status: "Completed",
  });

  useEffect(() => { loadRecord(); }, []);

  async function loadRecord() {
    try {
      const res = await api.get("/batch/details", { params: { sheet, recordId } });
      if (res.data.ok) setWorkflow(res.data.workflow);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    if (!form.dateVerified) { alert("Date Verified is required"); return; }
    try {
      setSubmitting(true);
      const res = await api.post("/batch/workflow/verification", {
        sheet, recordId, userId: user.userId,
        dateVerified: form.dateVerified,
        issueIdentified: form.issueIdentified,
        remarks1: form.remarks1,
        remarks2: form.remarks2,
        status: form.status,
      });
      if (res.data.ok) {
        alert("✅ Verification submitted successfully");
        navigate("/user/batch/tasks");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 32 }}>
          <div style={spinner} />
          <span style={{ color: "#64748b", fontSize: 14 }}>Loading batch record…</span>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={pageWrap}>
        <div style={{ ...card, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Record not found</div>
          <button onClick={() => navigate("/user/batch/tasks")} style={backBtn}>← Back to Tasks</button>
        </div>
      </div>
    );
  }

  const c = workflow.common || {};

  return (
    <div style={pageWrap}>

      {/* ── Record Details Card ── */}
      <div style={card}>
        <div style={header}>
          <div>
            <div style={headerLabel}>Batch Verification</div>
            <h2 style={headerTitle}>✅ Batch Workflow</h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#bbf7d0", marginBottom: 4 }}>Repository</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{c.newRepository || recordId}</div>
          </div>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>

          {/* ── Section: Record Details ── */}
          <SectionLabel icon="📋" title="Record Details" />
          <div style={sectionBox}>
            <div style={grid2}>
              <ReadField label="Chemical Name"        value={c.chemicalName} />
              <ReadField label="Manufacturer"         value={c.manufacturerName} />
              <ReadField label="Manufacturer Country" value={c.manufacturerCountry} />
              <ReadField label="Revision Date"        value={c.revisionDate} />
              <ReadField label="Verified Date"        value={c.verifiedDate} />
              <ReadField label="Language"             value={c.language} />
              <ReadField label="Repository"           value={c.newRepository} />
              <ReadField label="Product Code"         value={c.productCode} />
              <ReadField label="Site Name"            value={c.siteName} />
              <ReadField label="Site Approval Status" value={c.siteApprovalStatus} />
              <ReadField label="Site SDS #"           value={c.siteSdsNumber} />
              <ReadField label="PDF File"             value={c.pdfFileName} />
              <ReadField label="PDF Uploaded"         value={c.pdfUploaded} />
              <ReadField label="PDF QC Status"        value={c.pdfQcStatus} />
              <ReadField label="QC Complete By"       value={c.qcCompleteBy} />
              <ReadField label="Search Completed By"  value={c.searchCompletedBy} />
              <ReadField label="Search Verification"  value={c.searchVerificationAction} />
            </div>
            <div style={{ marginTop: 12 }}>
              <FieldLabel>Comments</FieldLabel>
              <div style={readText}>{c.comments || "—"}</div>
            </div>
            {c.siteSdsLink && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel>Site SDS Link</FieldLabel>
                <a href={c.siteSdsLink} target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontSize: 13, wordBreak: "break-all" }}>{c.siteSdsLink}</a>
              </div>
            )}
            {c.emailWebsite && (
              <div style={{ marginTop: 10 }}>
                <FieldLabel>Email / Website</FieldLabel>
                <a href={c.emailWebsite} target="_blank" rel="noreferrer" style={{ color: "#16a34a", fontSize: 13, wordBreak: "break-all" }}>{c.emailWebsite}</a>
              </div>
            )}
          </div>

          {/* ── Section: Verification Form ── */}
          <SectionLabel icon="✏️" title="Verification Form" />
          <div style={sectionBox}>
            <div style={grid2}>
              <div style={fieldCol}>
                <FieldLabel>Date Verified *</FieldLabel>
                <input
                  type="date"
                  value={form.dateVerified}
                  onChange={e => setForm({ ...form, dateVerified: e.target.value })}
                  style={inp}
                />
              </div>
              <div style={fieldCol}>
                <FieldLabel>Status</FieldLabel>
                <select
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  style={sel}
                >
                  <option>Completed</option>
                  <option>Not Completed</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldLabel>Issue Identified</FieldLabel>
              <select
                value={form.issueIdentified}
                onChange={e => setForm({ ...form, issueIdentified: e.target.value })}
                style={sel}
              >
                <option value="">Select issue (optional)</option>
                {issueOptions.map(issue => <option key={issue} value={issue}>{issue}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldLabel>Remarks 1</FieldLabel>
              <select
                value={form.remarks1}
                onChange={e => setForm({ ...form, remarks1: e.target.value })}
                style={sel}
              >
                <option value="">Select remark (optional)</option>
                {remarks1Options.map(remark => <option key={remark} value={remark}>{remark}</option>)}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <FieldLabel>Remarks 2</FieldLabel>
              <textarea
                rows={3}
                value={form.remarks2}
                onChange={e => setForm({ ...form, remarks2: e.target.value })}
                style={ta}
                placeholder="Enter additional remarks..."
              />
            </div>
          </div>

          {/* ── Submit ── */}
          <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
            <button onClick={submit} disabled={submitting} style={submitBtn(submitting)}>
              {submitting ? "Submitting..." : "✓ Submit Verification"}
            </button>
            <button onClick={() => navigate("/user/batch/tasks")} style={backBtn}>← Back</button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */
function SectionLabel({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px", fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      <span>{icon}</span>
      <span>{title}</span>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0", marginLeft: 6 }} />
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{children}</div>;
}

function ReadField({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", marginBottom: 4 }}>
      <FieldLabel>{label}</FieldLabel>
      <input value={value || "—"} readOnly style={readInp} />
    </div>
  );
}

/* ── Styles ── */
const pageWrap   = { boxSizing: "border-box" };
const card       = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" };
const header     = { background: "linear-gradient(135deg, #166534 0%, #16a34a 60%, #22c55e 100%)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const headerLabel = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#bbf7d0", textTransform: "uppercase", marginBottom: 4 };
const headerTitle = { margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" };
const sectionBox = { background: "#f8fafc", borderRadius: 10, border: "1.5px solid #cbd5e1", padding: "14px 16px", marginBottom: 4 };
const grid2      = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 16px" };
const fieldCol   = { display: "flex", flexDirection: "column" };
const readInp    = { padding: "8px 10px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#f1f5f9", fontSize: 13, color: "#475569", width: "100%", boxSizing: "border-box", outline: "none" };
const readText   = { padding: "8px 10px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#f1f5f9", fontSize: 13, color: "#475569", minHeight: 36 };
const inp        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const sel        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const ta         = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const submitBtn  = (disabled) => ({ padding: "12px 28px", borderRadius: 10, border: "none", background: disabled ? "#94a3b8" : "#16a34a", color: "#fff", fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 4px 14px rgba(22,163,74,0.35)" });
const backBtn    = { padding: "10px 20px", borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const spinner    = { width: 20, height: 20, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#16a34a", animation: "spin 0.8s linear infinite" };
