import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

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

  useEffect(() => {
    if (!sheet || !refId || !userId) { setLoading(false); return; }
    async function load() {
      try {
        const res = await api.get("/user/dq/workflow", { params: { sheet, repoId: refId, userId } });
        if (res.data.ok) {
          const r = res.data.reference;
          setRepo(r);
          setForm({
            dateVerified: r.dq?.transcription?.data?.dateVerified || "",
            issueIdentified: r.dq?.transcription?.data?.issueIdentified || "",
            remarks: r.dq?.transcription?.data?.remarks1 || "",
          });
        } else { setRepo(null); }
      } catch (err) {
        console.error("DQ WORK LOAD ERROR:", err);
        setRepo(null);
      } finally { setLoading(false); }
    }
    load();
  }, [sheet, refId, userId]);

  function updateField(key, value) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function submitForm() {
    if (!sheet || !refId || !userId) { alert("Session expired. Please login again."); return; }
    if (!form.dateVerified) { alert("Date Verified is required"); return; }
    if (submitting) return;
    try {
      setSubmitting(true);
      const res = await api.post("/dq/update", {
        sheet, repoId: refId,
        updates: { assignedTo: userId, dateVerified: form.dateVerified, issueIdentified: form.issueIdentified, remarks: form.remarks },
      });
      if (!res.data.ok) { alert(res.data.error || "Save failed"); return; }
      alert("✅ DQ work submitted successfully");
      navigate("/user/dq/tasks", { replace: true });
    } catch (err) {
      console.error("DQ SUBMIT ERROR:", err);
      alert("❌ Save failed");
    } finally { setSubmitting(false); }
  }

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={loadingCard}>
          <div style={spinner} />
          <span style={{ color: "#64748b", fontSize: 14 }}>Loading DQ work…</span>
        </div>
      </div>
    );
  }

  if (!repo) {
    return (
      <div style={pageWrap}>
        <div style={{ ...card, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Assigned DQ work not found</div>
          <button onClick={() => navigate("/user/dq/tasks")} style={backBtn}>← Back to Tasks</button>
        </div>
      </div>
    );
  }

  const c = repo.common || {};

  return (
    <div style={pageWrap}>

      {/* ── Main Card ── */}
      <div style={card}>
          {/* Header */}
          <div style={header}>
            <div>
              <div style={headerLabel}>Data Queue</div>
              <h2 style={headerTitle}>🗂️ DQ Work</h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#99f6e4", marginBottom: 4 }}>Repo ID</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{refId}</div>
            </div>
          </div>

          <div style={{ padding: "20px 24px 24px" }}>

            {/* ── Section: Common Fields ── */}
            <SectionLabel icon="📋" title="Record Information" />
            <div style={sectionBox}>
              <div style={grid2}>
                <ReadField label="SDS #"             value={c.sdsNumber} />
                <ReadField label="Chemical Product"  value={c.chemicalProduct} />
                <ReadField label="Manufacturer"      value={c.manufacturer} />
                <ReadField label="Revision Date"     value={c.revisionDate} />
                <ReadField label="Language"          value={c.language} />
                <ReadField label="SDS Status"        value={c.sdsStatus} />
                <ReadField label="Last Updated Date" value={c.lastUpdatedDate} />
                <ReadField label="Days in Queue"     value={c.daysInQueue} />
              </div>
              <div style={{ marginTop: 12 }}>
                <ReadField label="Sites In Use" value={c.sitesInUse} />
                <div style={{ marginTop: 10 }}>
                  <ReadField label="Supersede" value={c.supersede} />
                </div>
              </div>
            </div>

            {/* ── Section: Session Info ── */}
            <SectionLabel icon="👤" title="Session Info" />
            <div style={sectionBox}>
              <div style={grid2}>
                <ReadField label="Sheet"        value={sheet} />
                <ReadField label="Repo ID"      value={refId} />
                <ReadField label="Completed By" value={userId} />
              </div>
            </div>

            {/* ── Section: Your Work ── */}
            <SectionLabel icon="✏️" title="Your Work" />
            <div style={sectionBox}>
              <div style={grid2}>
                <div style={fieldCol}>
                  <FieldLabel>Date Verified *</FieldLabel>
                  <input
                    type="date"
                    value={form.dateVerified}
                    onChange={e => updateField("dateVerified", e.target.value)}
                    style={inp}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <FieldLabel>Issue Identified / Comment</FieldLabel>
                <select
                  value={form.issueIdentified}
                  onChange={e => updateField("issueIdentified", e.target.value)}
                  style={sel}
                >
                  <option value="">Select comment (optional)</option>
                  {DATA_QUEUE_COMMENTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <FieldLabel>Remarks (Optional)</FieldLabel>
                <textarea
                  value={form.remarks}
                  onChange={e => updateField("remarks", e.target.value)}
                  rows={3}
                  style={ta}
                  placeholder="Enter remarks..."
                />
              </div>
            </div>

            {/* ── Submit ── */}
            <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={submitForm} disabled={submitting} style={submitBtn(submitting)}>
                {submitting ? "Submitting..." : "✓ Submit DQ Work"}
              </button>
              <button onClick={() => navigate("/user/dq/tasks")} style={backBtn}>← Back</button>
            </div>

          </div>
        </div>
      </div>
  );
}

/* ── Sub-components ── */
function SectionLabel({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px", fontSize: 12, fontWeight: 700, color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
const header     = { background: "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const headerLabel = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#99f6e4", textTransform: "uppercase", marginBottom: 4 };
const headerTitle = { margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" };
const sectionBox = { background: "#f8fafc", borderRadius: 10, border: "1.5px solid #cbd5e1", padding: "14px 16px", marginBottom: 4 };
const grid2      = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 16px" };
const fieldCol   = { display: "flex", flexDirection: "column" };
const readInp    = { padding: "8px 10px", borderRadius: 8, border: "2px solid #e2e8f0", background: "#f1f5f9", fontSize: 13, color: "#475569", width: "100%", boxSizing: "border-box", outline: "none" };
const inp        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const sel        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const ta         = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const submitBtn  = (disabled) => ({ padding: "12px 28px", borderRadius: 10, border: "none", background: disabled ? "#94a3b8" : "#0d9488", color: "#fff", fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 4px 14px rgba(13,148,136,0.35)" });
const backBtn    = { padding: "10px 20px", borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const loadingCard = { display: "flex", alignItems: "center", gap: 12, padding: 24 };
const spinner    = { width: 20, height: 20, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" };
