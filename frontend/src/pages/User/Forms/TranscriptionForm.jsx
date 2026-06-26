import React, { useState } from "react";
import api from "../../../config/apiClient";

const TRANSCRIPTION_COMMENTS = [
  "No general SDS",
  "Discontinued",
  "Discontinued with an updated SDS",
  "Exempted",
  "Article",
  "Obsolete",
  "No update in revision Date",
  "Verified transcription",
  "Assign SDS",
  "Not able to view old repository number",
  "Not able to view new repository number",
  "Non-English SDS",
  "PDF not attached in the repository",
  "Not an SDS",
  "Incomplete SDS",
  "Test file",
  "Processed as problem identified SDS",
];

const TRANSCRIPTION_COMMENTS_EXPLANATION = [
  "As per SOP we do not consider Percent Volatile, hence not made any changes",
  "Limited Characters not fitting in the text box",
  "As per SOP we do not consider Percent Volatile, hence not made any changes and Limited Characters not fitting in the text box",
  "Completed",
];

export default function TranscriptionForm({ sheet, refId, userId, onDone }) {
  const [customComment, setCustomComment] = useState("");
  const [form, setForm] = useState({
    verifiedDate: "",
    comments1: "",
    comments2: "",
    remarks: "",
    remarks1: "",
    remarks2: "",
  });
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sheet || !refId || !userId) {
      alert("Workflow context missing. Please reload.");
      return;
    }
    try {
      setLoading(true);
      const fd = new FormData();
      fd.append("sheet", sheet);
      fd.append("refId", refId);
      fd.append("userId", userId);
      fd.append("verifiedDate", form.verifiedDate);
      fd.append("comments1", form.comments1 === "OTHER" ? customComment : form.comments1);
      fd.append("comments2", form.comments2);
      fd.append("remarks", form.remarks);
      fd.append("remarks1", form.remarks1);
      fd.append("remarks2", form.remarks2);

      const res = await api.post("/sds/workflow/transcription", fd);
      if (!res.data.ok) { alert(res.data.error || "Submit failed"); return; }
      alert("✅ Transcription completed. Sent to billing.");
      onDone && onDone();
    } catch (err) {
      console.error("TRANSCRIPTION ERROR:", err);
      alert("❌ Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      {/* ── Header ── */}
      <div style={header}>
        <div>
          <div style={headerLabel}>Workflow Stage</div>
          <h2 style={headerTitle}>📝 Transcription Stage</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 4 }}>Ref ID</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{refId}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>

        {/* ── Section: Verified Date ── */}
        <SectionLabel icon="📅" title="Verification Date" />
        <div style={sectionBox}>
          <div style={grid2}>
            <div style={field}>
              <FieldLabel>Verified Date *</FieldLabel>
              <input
                type="date"
                value={form.verifiedDate}
                onChange={e => update("verifiedDate", e.target.value)}
                required
                style={inp}
              />
            </div>
          </div>
        </div>

        {/* ── Section: Comments ── */}
        <SectionLabel icon="💬" title="Comments" />
        <div style={sectionBox}>
          <div style={field}>
            <FieldLabel>Comments for Transcription</FieldLabel>
            <select
              value={form.comments1}
              onChange={e => { update("comments1", e.target.value); if (e.target.value !== "OTHER") setCustomComment(""); }}
              style={sel}
            >
              <option value="">Select comment (optional)</option>
              {TRANSCRIPTION_COMMENTS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              <option value="OTHER">Other (custom)</option>
            </select>
            {form.comments1 === "OTHER" && (
              <input
                type="text"
                placeholder="Enter custom comment"
                value={customComment}
                onChange={e => setCustomComment(e.target.value)}
                style={{ ...inp, marginTop: 8 }}
              />
            )}
          </div>

          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Comments for Transcription 1</FieldLabel>
            <select
              value={form.comments2}
              onChange={e => update("comments2", e.target.value)}
              style={sel}
            >
              <option value="">Select explanation (optional)</option>
              {TRANSCRIPTION_COMMENTS_EXPLANATION.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        {/* ── Section: Remarks ── */}
        <SectionLabel icon="📝" title="Remarks" />
        <div style={sectionBox}>
          <div style={field}>
            <FieldLabel>Remarks</FieldLabel>
            <textarea
              value={form.remarks}
              onChange={e => update("remarks", e.target.value)}
              rows={3}
              style={ta}
              placeholder="Enter remarks..."
            />
          </div>
          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Remarks 1</FieldLabel>
            <textarea
              value={form.remarks1}
              onChange={e => update("remarks1", e.target.value)}
              rows={3}
              style={ta}
              placeholder="Enter remarks 1..."
            />
          </div>
          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Remarks 2</FieldLabel>
            <textarea
              value={form.remarks2}
              onChange={e => update("remarks2", e.target.value)}
              rows={3}
              style={ta}
              placeholder="Enter remarks 2..."
            />
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ marginTop: 20 }}>
          <button type="submit" disabled={loading} style={submitBtn(loading)}>
            {loading ? "Submitting..." : "✓ Submit Transcription"}
          </button>
        </div>

      </form>
    </div>
  );
}

/* ── Sub-components ── */
function SectionLabel({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px", fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      <span>{icon}</span>
      <span>{title}</span>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0", marginLeft: 6 }} />
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{children}</div>;
}

/* ── Styles ── */
const card       = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" };
const header     = { background: "linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const headerLabel = { fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 };
const headerTitle = { margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" };
const sectionBox = { background: "#f8fafc", borderRadius: 10, border: "1.5px solid #cbd5e1", padding: "14px 16px", marginBottom: 4 };
const grid2      = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 16px" };
const field      = { display: "flex", flexDirection: "column" };
const sel        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const inp        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const ta         = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const submitBtn  = (disabled) => ({ padding: "12px 32px", borderRadius: 10, border: "none", background: disabled ? "#94a3b8" : "#2563eb", color: "#fff", fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 4px 14px rgba(37,99,235,0.35)" });
