import React, { useState } from "react";
import api from "../../../config/apiClient";

export default function SupersedeForm({ sheet, refId, userId, onDone }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!sheet || !refId || !userId) {
      alert("Workflow context missing. Please reload.");
      return;
    }
    const fd = new FormData(e.target);
    fd.append("sheet", sheet);
    fd.append("refId", refId);
    fd.append("userId", userId);
    try {
      setLoading(true);
      const res = await api.post("/sds/workflow/supersede", fd);
      if (!res.data.ok) { alert(res.data.error || "Submit failed"); return; }
      alert("✅ Supersede completed. Waiting for admin assignment.");
      onDone && onDone();
    } catch (err) {
      console.error("SUPERSEDE ERROR:", err);
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
          <h2 style={headerTitle}>✏️ Supersede Stage</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 4 }}>Ref ID</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{refId}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>

        {/* ── Section: Repository Info ── */}
        <SectionLabel icon="📁" title="Repository Info" />
        <div style={sectionBox}>
          <div style={grid2}>
            <div style={field}>
              <FieldLabel>New Repository Number *</FieldLabel>
              <input name="newRepositoryNumber" required placeholder="Enter repository number" style={inp} />
            </div>
          </div>
        </div>

        {/* ── Section: Dates ── */}
        <SectionLabel icon="📅" title="Dates" />
        <div style={sectionBox}>
          <div style={grid2}>
            <div style={field}>
              <FieldLabel>Supersede Date *</FieldLabel>
              <input type="date" name="supersedeDate" required style={inp} />
            </div>
            <div style={field}>
              <FieldLabel>Verified Date *</FieldLabel>
              <input type="date" name="verifiedDate" required style={inp} />
            </div>
          </div>
        </div>

        {/* ── Section: Comments ── */}
        <SectionLabel icon="💬" title="Comments" />
        <div style={sectionBox}>
          <div style={field}>
            <FieldLabel>Comments</FieldLabel>
            <textarea name="comments1" rows={3} style={ta} placeholder="Enter comments..." />
          </div>
          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Comments 2</FieldLabel>
            <textarea name="comments2" rows={3} style={ta} placeholder="Enter additional comments..." />
          </div>
        </div>

        {/* ── Section: Remarks ── */}
        <SectionLabel icon="📝" title="Remarks" />
        <div style={sectionBox}>
          <div style={field}>
            <FieldLabel>Remarks</FieldLabel>
            <textarea name="remarks" rows={3} style={ta} placeholder="Enter remarks..." />
          </div>
          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Remarks 1</FieldLabel>
            <textarea name="remarks1" rows={3} style={ta} placeholder="Enter remarks 1..." />
          </div>
          <div style={{ ...field, marginTop: 12 }}>
            <FieldLabel>Remarks 2</FieldLabel>
            <textarea name="remarks2" rows={3} style={ta} placeholder="Enter remarks 2..." />
          </div>
        </div>

        {/* ── Section: PDF Upload ── */}
        <SectionLabel icon="📎" title="PDF Upload" />
        <div style={{ ...sectionBox, display: "flex", alignItems: "center" }}>
          <label style={uploadLabel}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span>Click to upload PDF (optional)</span>
            <input type="file" name="pdf" accept="application/pdf" style={{ display: "none" }} />
          </label>
        </div>

        {/* ── Submit ── */}
        <div style={{ marginTop: 20 }}>
          <button type="submit" disabled={loading} style={submitBtn(loading)}>
            {loading ? "Submitting..." : "✓ Submit Supersede"}
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
const inp        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const ta         = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const uploadLabel = { display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 8, border: "2px dashed #cbd5e1", background: "#f8fafc", cursor: "pointer", flex: 1, color: "#475569", fontSize: 13, fontWeight: 600 };
const submitBtn  = (disabled) => ({ padding: "12px 32px", borderRadius: 10, border: "none", background: disabled ? "#94a3b8" : "#2563eb", color: "#fff", fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer", boxShadow: disabled ? "none" : "0 4px 14px rgba(37,99,235,0.35)" });
