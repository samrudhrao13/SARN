import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

import SearchForm      from "./Forms/SearchForm";
import SupersedeForm   from "./Forms/SupersedeForm";
import TranscriptionForm from "./Forms/TranscriptionForm";

/* ── Helpers ── */
const safeVal = (v) => {
  if (v === null || v === undefined) return "—";
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleString();
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v) || "—";
};

function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const canWork = (workflow, stage, userId) => {
  const s = workflow?.[stage];
  return (
    workflow?.currentStage === stage &&
    workflow?.workflowStatus !== "ASSIGN_PENDING" &&
    s?.assignedTo === userId &&
    s?.status !== "completed"
  );
};

/* ── Stage config ── */
const STAGE_CONFIG = {
  search:       { label: "Search",       color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  supersede:    { label: "Supersede",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  transcription:{ label: "Transcription",color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  billing:      { label: "Billing",      color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

/* ── Skipped internal fields ── */
const SKIP_FIELDS = new Set(["pdfId", "draftSaved", "isMultilingual"]);

/* ================= COMPONENT ================= */

export default function WorkflowUserView() {
  const { sheet, referenceId } = useParams();
  const navigate = useNavigate();

  const stored = localStorage.getItem("sarnUser");
  const user   = stored ? JSON.parse(stored) : null;
  const userId = user?.userId;

  const [workflow, setWorkflow] = useState(null);
  const [loading,  setLoading]  = useState(true);

  if (!userId) {
    return <p style={{ color: "red", padding: 24 }}>Session expired. Please login again.</p>;
  }

  const loadWorkflow = useCallback(() => {
    setLoading(true);
    api.get("/workflow/details", { params: { sheet, refId: referenceId } })
      .then((res) => setWorkflow(res.data.ok ? res.data.workflow : null))
      .catch(() => setWorkflow(null))
      .finally(() => setLoading(false));
  }, [sheet, referenceId]);

  useEffect(() => { loadWorkflow(); }, [loadWorkflow]);

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 32 }}>
          <div style={spinnerEl} />
          <span style={{ color: "#64748b", fontSize: 14 }}>Loading workflow…</span>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div style={pageWrap}>
        <div style={{ ...infoCard, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>Reference not found</div>
          <button onClick={() => navigate("/user/assigned-sds")} style={backBtn}>← Back to Assigned Work</button>
        </div>
      </div>
    );
  }

  const stage      = workflow.currentStage || "search";
  const stageCfg   = STAGE_CONFIG[stage] || STAGE_CONFIG.search;

  return (
    <div style={pageWrap}>

      {/* ── Top bar ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button onClick={() => navigate("/user/assigned-sds")} style={backBtn}>← Back to Assigned Work</button>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 18px", borderRadius: 999, fontSize: 12, fontWeight: 800,
          letterSpacing: "0.06em", textTransform: "uppercase",
          background: stageCfg.bg, color: stageCfg.color, border: `1.5px solid ${stageCfg.border}`,
        }}>
          Current Stage: {stageCfg.label}
        </div>
      </div>

      {/* ── Common Fields ── */}
      <ReadOnlyCard title="Common Fields" icon="📄" data={workflow.common} accentColor="#475569" />

      {/* ── SEARCH stage ── */}
      {stage === "search" && (
        canWork(workflow, "search", userId)
          ? <SearchForm sheet={sheet} refId={referenceId} userId={userId} searchData={workflow.search || {}} onDone={loadWorkflow} />
          : <WaitingCard stage="Search" />
      )}

      {/* ── SUPERSEDE stage ── */}
      {stage === "supersede" && (
        <>
          <ReadOnlyCard title="Search Stage" icon="🔍" data={workflow.search} accentColor="#2563eb" />
          {canWork(workflow, "supersede", userId)
            ? <SupersedeForm sheet={sheet} refId={referenceId} userId={userId} onDone={loadWorkflow} />
            : <WaitingCard stage="Supersede" />}
        </>
      )}

      {/* ── TRANSCRIPTION stage ── */}
      {stage === "transcription" && (
        <>
          <ReadOnlyCard title="Search Stage"    icon="🔍" data={workflow.search}    accentColor="#2563eb" />
          <ReadOnlyCard title="Supersede Stage" icon="✏️" data={workflow.supersede} accentColor="#7c3aed" />
          {canWork(workflow, "transcription", userId)
            ? <TranscriptionForm sheet={sheet} refId={referenceId} userId={userId} onDone={loadWorkflow} />
            : <WaitingCard stage="Transcription" />}
        </>
      )}

      {/* ── BILLING stage ── */}
      {stage === "billing" && (
        <div style={infoCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#166534" }}>Sent to Billing</div>
              <div style={{ fontSize: 13, color: "#4ade80", marginTop: 2 }}>This record has been processed and sent to the billing stage.</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Read-Only Card ── */
function ReadOnlyCard({ title, icon, data, accentColor = "#475569" }) {
  if (!data || typeof data !== "object") return null;

  const entries = Object.entries(data).filter(([k, v]) => {
    if (SKIP_FIELDS.has(k)) return false;
    const val = safeVal(v);
    return val !== "—" && val !== "";
  });

  if (entries.length === 0) return null;

  const urlFields    = entries.filter(([, v]) => { const s = safeVal(v); return s.startsWith("http") || s.startsWith("www."); });
  const longFields   = entries.filter(([, v]) => { const s = safeVal(v); return !s.startsWith("http") && !s.startsWith("www.") && s.length > 60; });
  const shortFields  = entries.filter(([, v]) => { const s = safeVal(v); return !s.startsWith("http") && !s.startsWith("www.") && s.length <= 60; });
  const pdfUrl       = data?.pdfUrl || data?.pdf;

  return (
    <div style={{ ...infoCard, overflow: "hidden", padding: 0, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ background: accentColor, padding: "14px 20px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "0.02em" }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Read Only</span>
      </div>

      <div style={{ padding: "16px 20px 20px" }}>

        {/* Short fields — 2 col grid */}
        {shortFields.length > 0 && (
          <div style={grid2}>
            {shortFields.map(([k, v]) => (
              <div key={k} style={fieldCol}>
                <FieldLabel>{camelToLabel(k)}</FieldLabel>
                <input value={safeVal(v)} readOnly style={readInp} />
              </div>
            ))}
          </div>
        )}

        {/* URL fields — full width */}
        {urlFields.length > 0 && (
          <div style={{ marginTop: shortFields.length > 0 ? 12 : 0 }}>
            {urlFields.map(([k, v]) => {
              const s = safeVal(v);
              const href = s.startsWith("www.") ? `https://${s}` : s;
              return (
                <div key={k} style={{ marginBottom: 10 }}>
                  <FieldLabel>{camelToLabel(k)}</FieldLabel>
                  <a href={href} target="_blank" rel="noreferrer" style={linkStyle}>{s}</a>
                </div>
              );
            })}
          </div>
        )}

        {/* Long text fields — full width */}
        {longFields.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {longFields.map(([k, v]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <FieldLabel>{camelToLabel(k)}</FieldLabel>
                <div style={readTextBox}>{safeVal(v)}</div>
              </div>
            ))}
          </div>
        )}

        {/* PDF Download */}
        {pdfUrl && (
          <div style={{ marginTop: 14 }}>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={downloadBtn}>
              ⬇ Download PDF
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Waiting Card ── */
function WaitingCard({ stage }) {
  return (
    <div style={{ ...infoCard, background: "#fffbeb", border: "1.5px solid #fde68a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>⏳</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#92400e" }}>{stage} — Waiting for Assignment</div>
          <div style={{ fontSize: 12, color: "#b45309", marginTop: 2 }}>Your admin needs to assign this stage before you can proceed.</div>
        </div>
      </div>
    </div>
  );
}

/* ── Field Label ── */
function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{children}</div>;
}

/* ── Styles ── */
const pageWrap   = { boxSizing: "border-box" };
const infoCard   = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20, padding: 20 };
const grid2      = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 16px" };
const fieldCol   = { display: "flex", flexDirection: "column" };
const readInp    = { padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, color: "#334155", width: "100%", boxSizing: "border-box", outline: "none" };
const readTextBox = { padding: "8px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, color: "#334155", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" };
const linkStyle  = { display: "inline-block", padding: "7px 10px", borderRadius: 7, border: "1.5px solid #bfdbfe", background: "#eff6ff", fontSize: 13, color: "#2563eb", wordBreak: "break-all", textDecoration: "none" };
const downloadBtn = { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#1d4ed8", color: "#fff", borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: "none" };
const backBtn    = { padding: "9px 18px", borderRadius: 8, border: "1.5px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const spinnerEl  = { width: 20, height: 20, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#2563eb", animation: "spin 0.8s linear infinite" };
