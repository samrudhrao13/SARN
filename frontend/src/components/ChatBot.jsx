import React, { useState, useRef, useEffect } from "react";
import api from "../config/apiClient";

const BACKEND = import.meta.env.VITE_API_URL || "https://sarn-backend-862276535294.asia-south1.run.app";

// Split text into sentence-level lines for side-by-side translation
function splitLines(text) {
  if (!text) return [""];
  const lines = [];
  for (const chunk of text.split(/\r?\n/)) {
    const trimmed = chunk.trim();
    if (!trimmed) { lines.push(""); continue; }
    if (trimmed.length > 120) {
      const parts = trimmed.split(/\.\s+/);
      parts.forEach((part, idx) => {
        const s = part.trim();
        if (s) lines.push(idx < parts.length - 1 ? s + "." : s);
      });
    } else {
      lines.push(trimmed);
    }
  }
  return lines.length ? lines : [""];
}

const MAT_PATTERN = /(?:find|search|get|show|look\s*up|mat|mat#|mat\s*number)[\s:]*(\d{4,8})|^\s*(\d{4,8})\s*$/i;

function extractMat(msg) {
  const m = msg.match(MAT_PATTERN);
  return m ? (m[1] || m[2]) : null;
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("sarnUser") || "null"); } catch { return null; }
}

export default function ChatBot() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    isAdmin
      ? { from: "bot", text: "Hi! I'm your SARN Admin Assistant.\n\nI can help you with:\n• Batch sheet reports & stats\n• Weekly / daily productivity reports\n• User performance breakdown\n• Workflow alerts\n• Search Drive files + Firestore records by MAT / SDS / Repo number\n\nTry: \"Give me the weekly report\" or type a number like \"1311776\"" }
      : { from: "bot", text: `Hi ${currentUser?.name || ""}! I'm your SARN Assistant.\n\nI can help you with:\n• 🔍 Search records by MAT / SDS / Repo number\n• 📄 Upload a PDF to extract key fields\n• 🌐 Translate PDF sections to English\n• 📥 Download your personal report\n\nType a number to search, or use 📎 to upload a PDF.` },
  ]);
  const [input, setInput] = useState(false);
  const [input2, setInput2] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [driveResults, setDriveResults] = useState(null);
  const [firestoreResults, setFirestoreResults] = useState(null);
  const [expandedSds, setExpandedSds] = useState(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pdfFields, setPdfFields] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [pdfSections, setPdfSections] = useState([]);
  const [sectionTranslations, setSectionTranslations] = useState({});
  const [sectionTranslating, setSectionTranslating] = useState({});
  const [sectionExpanded, setSectionExpanded] = useState({});
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });
  const [sdsScanFields, setSdsScanFields] = useState(null);
  const [sdsScanCopied, setSdsScanCopied] = useState(false);
  const [deadlineAlerts, setDeadlineAlerts] = useState([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const fileRef   = useRef(null);
  const scanRef   = useRef(null);
  const bottomRef = useRef(null);

  function addUsage(usage) {
    if (!usage) return;
    setTokenUsage(prev => ({
      prompt:     prev.prompt     + (usage.prompt_tokens     || 0),
      completion: prev.completion + (usage.completion_tokens || 0),
      total:      prev.total      + (usage.total_tokens      || 0),
    }));
  }

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (!open || !isAdmin || alertsLoaded) return;
    api.get("/admin/deadline-alerts")
      .then(res => {
        const alerts = res.data.ok ? (res.data.alerts || []) : [];
        setDeadlineAlerts(alerts);
        setMessages(prev => [
          ...prev.filter(m => m.type !== "deadline_alerts"),
          { from: "bot", type: "deadline_alerts", alerts },
        ]);
      })
      .catch(() => {})
      .finally(() => setAlertsLoaded(true));
  }, [open]);

  function refreshAlerts() {
    setAlertsLoaded(false);
    api.get("/admin/deadline-alerts")
      .then(res => {
        const alerts = res.data.ok ? (res.data.alerts || []) : [];
        setDeadlineAlerts(alerts);
        setMessages(prev => [
          ...prev.filter(m => m.type !== "deadline_alerts"),
          { from: "bot", type: "deadline_alerts", alerts },
        ]);
      })
      .catch(() => {})
      .finally(() => setAlertsLoaded(true));
  }

  function downloadReport(period) {
    window.open(`${BACKEND}/admin/report/pdf?period=${period}`, "_blank");
  }

  async function handleSDSScan(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSdsScanFields(null);
    setDriveResults(null);
    setFirestoreResults(null);
    setPdfFields(null);
    setMessages(prev => [
      ...prev,
      { from: "user", text: `🔬 ${file.name}` },
      { from: "bot",  text: "Scanning SDS — extracting all template fields via Groq AI..." },
    ]);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await api.post("/admin/sds/scan", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.ok) {
        addUsage(res.data.usage);
        const compCount = res.data.fields?.composition?.length || 0;
        const ghsCount  = res.data.fields?.ghs_pictograms?.length || 0;
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: `SDS scan complete. Found ${ghsCount} GHS pictogram${ghsCount !== 1 ? "s" : ""} and ${compCount} ingredient${compCount !== 1 ? "s" : ""} in Section 3.` },
        ]);
        setSdsScanFields(res.data.fields);
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: res.data.error || "Could not scan PDF." },
        ]);
      }
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { from: "bot", text: "Could not reach the server. Please try again." }]);
    }
    setLoading(false);
    e.target.value = "";
  }

  async function handlePDF(e) {
    const file = e.target.files[0];
    if (!file) return;
    setDriveResults(null);
    setFirestoreResults(null);
    setExpandedSds(null);
    setPdfFields(null);
    setMessages(prev => [
      ...prev,
      { from: "user", text: `📄 ${file.name}` },
      { from: "bot", text: "Extracting fields from PDF..." },
    ]);
    setShowDownload(false);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("pdf", file);
      const res = await api.post("/admin/chat", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.ok && res.data.type === "pdf_extract") {
        const sectionCount = res.data.sections?.length || 0;
        addUsage(res.data.usage);
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: `Fields extracted. ${sectionCount} section${sectionCount !== 1 ? "s" : ""} found — click any to expand, then translate individually.` },
        ]);
        setPdfFields(res.data.pdfFields);
        setPdfSections(res.data.sections || []);
      } else {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: res.data.error || "Could not extract fields from PDF." },
        ]);
      }
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { from: "bot", text: "Could not reach the server. Please try again." }]);
    }
    setLoading(false);
    e.target.value = "";
  }

  async function handleSend() {
    const msg = input2.trim();
    if (!msg || loading) return;
    setInput2("");
    setShowDownload(false);
    setDriveResults(null);
    setFirestoreResults(null);
    setExpandedSds(null);
    setPdfFields(null);
    setSdsScanFields(null);
    setTranslating(false);
    setPdfSections([]);
    setSectionTranslations({});
    setSectionTranslating({});
    setSectionExpanded({});

    const matNumber = extractMat(msg);

    setMessages(prev => [
      ...prev,
      { from: "user", text: msg },
      { from: "bot", text: matNumber ? `Searching Drive & Firestore for "${matNumber}"...` : "Fetching live data..." },
    ]);
    setLoading(true);

    if (matNumber) {
      const [driveRes, fsRes] = await Promise.allSettled([
        api.get(`/admin/drive/search?mat=${matNumber}`),
        api.get(`/admin/firestore/search?q=${matNumber}`),
      ]);

      const driveData = driveRes.status === "fulfilled" ? driveRes.value.data : null;
      const fsData = fsRes.status === "fulfilled" ? fsRes.value.data : null;

      const driveCount = driveData?.ok ? driveData.count : 0;
      const fsTotal = fsData?.ok ? fsData.total : 0;

      if (driveCount === 0 && fsTotal === 0) {
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: `No results found for "${matNumber}" in Drive or Firestore records.` },
        ]);
      } else {
        const parts = [];
        if (driveCount > 0) parts.push(`${driveCount} Drive file${driveCount !== 1 ? "s" : ""}`);
        if (fsTotal > 0) parts.push(`${fsTotal} Firestore record${fsTotal !== 1 ? "s" : ""}`);
        setMessages(prev => [
          ...prev.slice(0, -1),
          { from: "bot", text: `Found ${parts.join(" and ")} for "${matNumber}":` },
        ]);
        if (driveCount > 0) setDriveResults(driveData.files);
        if (fsTotal > 0) setFirestoreResults(fsData);
      }

      setLoading(false);
      return;
    }

    if (!isAdmin) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { from: "bot", text: "Type a MAT / SDS / Repo number to search records, or use 📎 to upload a PDF for extraction and translation." },
      ]);
      setLoading(false);
      return;
    }

    const isReportQuery = /report|weekly|week|summary|overview|productiv|perform/i.test(msg);

    try {
      const form = new FormData();
      form.append("message", msg);
      const res = await api.post("/admin/chat", form, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data.ok) addUsage(res.data.usage);
      setMessages(prev => [
        ...prev.slice(0, -1),
        { from: "bot", text: res.data.ok ? res.data.reply : (res.data.error || "Failed.") },
      ]);
      if (res.data.ok && isReportQuery) setShowDownload(true);
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { from: "bot", text: "Could not reach the server. Please try again." }]);
    }

    setLoading(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        title="SARN Assistant"
        style={{
          position: "fixed", bottom: 28, right: 28,
          width: 54, height: 54, borderRadius: "50%",
          background: "#2563eb", color: "#fff", border: "none",
          cursor: "pointer", fontSize: 24,
          boxShadow: "0 4px 16px rgba(37,99,235,0.45)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={fullscreen ? {
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "#0f172a", borderRadius: 0,
          boxShadow: "none",
          display: "flex", flexDirection: "column",
          zIndex: 9998, overflow: "hidden", border: "none",
        } : {
          position: "fixed", bottom: 94, right: 28,
          width: 380, height: 540,
          background: "#0f172a", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          zIndex: 9998, overflow: "hidden", border: "1px solid #1e40af",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #1e40af, #2563eb)",
            color: "#fff", padding: "12px 16px",
            fontWeight: 700, fontSize: 15,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>🤖</span>
            <span>SARN Assistant</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              {isAdmin ? (
                <>
                  <button onClick={() => downloadReport("today")} title="Download today's report"
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                    📥 Today</button>
                  <button onClick={() => downloadReport("week")} title="Download weekly report"
                    style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                    📥 Week</button>
                  <button onClick={() => downloadReport("month")} title="Download monthly report"
                    style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                    📥 Month</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>My Report:</span>
                  {["today", "week", "month"].map(p => (
                    <button key={p}
                      onClick={() => window.open(`${BACKEND}/admin/report/user-detail?userId=${currentUser?.userId}&period=${p}`, "_blank")}
                      title={`Download my ${p} report`}
                      style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>
                      📥 {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </>
              )}
              <button
                onClick={() => setFullscreen(f => !f)}
                title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, color: "#fff", padding: "3px 8px", cursor: "pointer", fontSize: 13, lineHeight: 1 }}
              >{fullscreen ? "⊠" : "⛶"}</button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 12px",
            display: "flex", flexDirection: "column", gap: 10, background: "#0f172a",
          }}>
            {messages.map((m, i) => {
              if (m.type === "deadline_alerts") {
                const alerts = m.alerts || [];
                return (
                  <div key={i} style={{ maxWidth: "100%" }}>
                    <div style={{ background: "#0a0f1e", border: "1px solid #1e293b", borderLeft: "3px solid #f59e0b", borderRadius: 12, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: alerts.length ? 10 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>
                          <span>🔔</span>
                          <span>Deadline Alerts</span>
                          {alerts.length > 0 && (
                            <span style={{ background: "#7c2d12", color: "#fed7aa", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                              {alerts.length}
                            </span>
                          )}
                        </div>
                        <button onClick={refreshAlerts} style={{ background: "transparent", border: "1px solid #334155", borderRadius: 4, color: "#64748b", fontSize: 10, padding: "2px 7px", cursor: "pointer" }}>
                          ↻ Refresh
                        </button>
                      </div>
                      {alerts.length === 0 && (
                        <div style={{ fontSize: 12, color: "#64748b", fontStyle: "italic" }}>No pending deadline alerts — all sheets are on track.</div>
                      )}
                      {alerts.map((alert, ai) => {
                        const urgColor  = alert.urgency === "overdue" ? "#ef4444" : alert.urgency === "critical" ? "#f97316" : "#f59e0b";
                        const urgBg     = alert.urgency === "overdue" ? "#1c0808" : alert.urgency === "critical" ? "#1c0e08" : "#1c1808";
                        const urgBorder = alert.urgency === "overdue" ? "#7f1d1d" : alert.urgency === "critical" ? "#7c2d12" : "#713f12";
                        const urgLabel  = alert.urgency === "overdue"
                          ? `${Math.abs(alert.daysLeft)}d overdue`
                          : alert.daysLeft === 0 ? "Due today"
                          : `${alert.daysLeft}d left`;
                        const belowUsers = alert.users.filter(u => u.vsAvg === "below");
                        const aboveUsers = alert.users.filter(u => u.vsAvg === "above");
                        return (
                          <div key={ai} style={{ background: urgBg, border: `1px solid ${urgBorder}`, borderRadius: 7, padding: "8px 10px", marginBottom: ai < alerts.length - 1 ? 6 : 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <span style={{ fontSize: 10, fontWeight: 700, background: urgColor, color: "#fff", borderRadius: 4, padding: "1px 6px" }}>{alert.module}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{alert.sheet}</span>
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 700, color: urgColor }}>⏰ {urgLabel}</span>
                            </div>
                            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 5 }}>
                              Due: {alert.dueDate} &nbsp;·&nbsp; Avg: <span style={{ color: "#94a3b8", fontWeight: 600 }}>{alert.avgCompletionRate}%</span>
                              &nbsp;·&nbsp; {alert.users.length} user{alert.users.length !== 1 ? "s" : ""} pending
                            </div>
                            {belowUsers.length > 0 && (
                              <div style={{ marginBottom: 3 }}>
                                <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 2 }}>▼ Below avg ({belowUsers.length})</div>
                                {belowUsers.map((u, ui) => (
                                  <div key={ui} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#fca5a5", padding: "2px 0", borderBottom: ui < belowUsers.length - 1 ? "1px solid #2d1010" : "none" }}>
                                    <span style={{ fontWeight: 600 }}>{u.userId}</span>
                                    <span>{u.pending}p / {u.assigned}t · <span style={{ color: "#ef4444", fontWeight: 700 }}>{u.completionRate}%</span></span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {aboveUsers.length > 0 && (
                              <div>
                                <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700, marginBottom: 2 }}>▲ Above avg ({aboveUsers.length})</div>
                                {aboveUsers.map((u, ui) => (
                                  <div key={ui} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#86efac", padding: "2px 0", borderBottom: ui < aboveUsers.length - 1 ? "1px solid #0a2010" : "none" }}>
                                    <span style={{ fontWeight: 600 }}>{u.userId}</span>
                                    <span>{u.pending}p / {u.assigned}t · <span style={{ color: "#22c55e", fontWeight: 700 }}>{u.completionRate}%</span></span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "9px 13px",
                    borderRadius: m.from === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.from === "user" ? "#2563eb" : "#1e293b",
                    color: "#f1f5f9", fontSize: 13, lineHeight: 1.6,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                    border: m.from === "bot" ? "1px solid #334155" : "none",
                  }}>
                    {m.text}
                  </div>
                </div>
              );
            })}

            {/* PDF extracted fields card */}
            {pdfFields && (
              <div style={{
                background: "#1e293b", border: "1px solid #0e7490",
                borderRadius: 10, padding: "12px 14px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#0e7490", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Extracted Fields
                  </div>
                  <button
                    disabled={translating}
                    onClick={async () => {
                      setTranslating(true);
                      try {
                        const res = await api.post("/admin/pdf/translate", { fields: pdfFields });
                        if (res.data.ok) { setPdfFields(res.data.fields); addUsage(res.data.usage); }
                      } catch {}
                      setTranslating(false);
                    }}
                    style={{
                      background: translating ? "#334155" : "#1e40af",
                      color: "#fff", border: "none", borderRadius: 5,
                      padding: "3px 10px", fontSize: 11, fontWeight: 600,
                      cursor: translating ? "not-allowed" : "pointer",
                    }}
                  >
                    {translating ? "Translating..." : "Translate to English"}
                  </button>
                </div>
                {[
                  ["Business Entity",   pdfFields.businessEntity],
                  ["Repository No.",    pdfFields.repositoryNumber],
                  ["Chemical Product",  pdfFields.chemicalProduct],
                  ["Manufacturer",      pdfFields.manufacturer],
                  ["Revision Date",     pdfFields.revisionDate],
                  ["Verification Date", pdfFields.verificationDate],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 12 }}>
                    <span style={{ color: "#64748b", minWidth: 120, flexShrink: 0 }}>{label}:</span>
                    <span style={{ color: value ? "#e2e8f0" : "#475569", fontStyle: value ? "normal" : "italic" }}>
                      {value || "Not found"}
                    </span>
                  </div>
                ))}
                {pdfFields.repositoryNumber && (
                  <button
                    onClick={async () => {
                      const q = pdfFields.repositoryNumber;
                      setDriveResults(null);
                      setFirestoreResults(null);
                      setMessages(prev => [...prev, { from: "bot", text: `Searching Drive & Firestore for "${q}"...` }]);
                      setLoading(true);
                      const [driveRes, fsRes] = await Promise.allSettled([
                        api.get(`/admin/drive/search?mat=${q}`),
                        api.get(`/admin/firestore/search?q=${q}`),
                      ]);
                      const driveData = driveRes.status === "fulfilled" ? driveRes.value.data : null;
                      const fsData = fsRes.status === "fulfilled" ? fsRes.value.data : null;
                      const driveCount = driveData?.ok ? driveData.count : 0;
                      const fsTotal = fsData?.ok ? fsData.total : 0;
                      const parts = [];
                      if (driveCount > 0) parts.push(`${driveCount} Drive file${driveCount !== 1 ? "s" : ""}`);
                      if (fsTotal > 0) parts.push(`${fsTotal} Firestore record${fsTotal !== 1 ? "s" : ""}`);
                      setMessages(prev => [...prev.slice(0, -1), {
                        from: "bot",
                        text: parts.length ? `Found ${parts.join(" and ")} for "${q}":` : `No results found for "${q}" in Drive or Firestore.`,
                      }]);
                      if (driveCount > 0) setDriveResults(driveData.files);
                      if (fsTotal > 0) setFirestoreResults(fsData);
                      setLoading(false);
                    }}
                    style={{
                      marginTop: 10, background: "#0e7490", color: "#fff",
                      border: "none", borderRadius: 6, padding: "6px 14px",
                      fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                    }}
                  >
                    Search "{pdfFields.repositoryNumber}" in Drive & Firestore
                  </button>
                )}
              </div>
            )}

            {/* SDS Scanner results card */}
            {sdsScanFields && (() => {
              const f = sdsScanFields;
              function copyAll() {
                const comp = (f.composition || []).map(c => `    ${c.name || "?"}  |  CAS: ${c.cas || "?"}  |  ${c.percentage || "?"}`).join("\n");
                const text = `=== SDS TEMPLATE FIELDS ===\n\nManufacturer: ${f.manufacturer_name || "—"}\nCity: ${f.city || "—"}\nState: ${f.state || "—"}\nZip: ${f.zip || "—"}\nEmail: ${f.email || "—"}\nContact: ${f.contact || "—"}\nEmergency: ${f.emergency || "—"}\n\nGHS Pictograms:\n${(f.ghs_pictograms || []).map(g => "  - " + g).join("\n") || "  —"}\n\nChemical Name: ${f.chemical_name || "—"}\nProduct No.: ${f.product_number || "—"}\nTrade Names: ${(f.trade_names || []).join(", ") || "—"}\n\nComposition (Section 3):\n${comp || "  —"}\n\nVOC Content: ${f.voc_content || "—"}\nSolid Content: ${f.solid_content || "—"}`;
                navigator.clipboard.writeText(text).then(() => { setSdsScanCopied(true); setTimeout(() => setSdsScanCopied(false), 2000); });
              }
              const Row = ({ label, value }) => (
                <div style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: "#64748b", minWidth: 110, flexShrink: 0 }}>{label}:</span>
                  <span style={{ color: value ? "#e2e8f0" : "#475569", fontStyle: value ? "normal" : "italic" }}>{value || "—"}</span>
                </div>
              );
              return (
                <div style={{ background: "#1e293b", border: "1px solid #d97706", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#d97706", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      🔬 SDS Template Fields
                    </div>
                    <button onClick={copyAll} style={{ background: sdsScanCopied ? "#14532d" : "#1e40af", color: "#fff", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                      {sdsScanCopied ? "✓ Copied" : "Copy All"}
                    </button>
                  </div>

                  <Row label="Manufacturer"  value={f.manufacturer_name} />
                  <Row label="City"          value={f.city} />
                  <Row label="State"         value={f.state} />
                  <Row label="Zip"           value={f.zip} />
                  <Row label="Email"         value={f.email} />
                  <Row label="Contact"       value={f.contact} />
                  <Row label="Emergency"     value={f.emergency} />

                  {/* GHS Pictograms */}
                  <div style={{ marginTop: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>GHS Pictograms:</div>
                    {(f.ghs_pictograms || []).length > 0
                      ? (f.ghs_pictograms || []).map((g, i) => (
                          <span key={i} style={{ display: "inline-block", background: "#451a03", color: "#fbbf24", borderRadius: 4, fontSize: 10, fontWeight: 700, padding: "2px 7px", margin: "2px 2px 2px 0" }}>{g}</span>
                        ))
                      : <span style={{ color: "#475569", fontStyle: "italic", fontSize: 12 }}>—</span>
                    }
                  </div>

                  <Row label="Chemical Name"  value={f.chemical_name} />
                  <Row label="Product No."    value={f.product_number} />

                  {(f.trade_names || []).length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginBottom: 4, fontSize: 12 }}>
                      <span style={{ color: "#64748b", minWidth: 110, flexShrink: 0 }}>Trade Names:</span>
                      <span style={{ color: "#e2e8f0" }}>{f.trade_names.join(", ")}</span>
                    </div>
                  )}

                  {/* Composition */}
                  {(f.composition || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>Composition (Section 3):</div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ background: "#0f172a" }}>
                              {["Ingredient", "CAS No.", "%"].map(h => (
                                <th key={h} style={{ padding: "4px 7px", textAlign: "left", color: "#94a3b8", fontWeight: 600, borderBottom: "1px solid #334155" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {f.composition.map((c, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                                <td style={{ padding: "4px 7px", color: "#e2e8f0" }}>{c.name || "—"}</td>
                                <td style={{ padding: "4px 7px", color: "#94a3b8" }}>{c.cas || "—"}</td>
                                <td style={{ padding: "4px 7px", color: "#94a3b8" }}>{c.percentage || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Row label="VOC Content"   value={f.voc_content} />
                  <Row label="Solid Content" value={f.solid_content} />
                </div>
              );
            })()}

            {/* PDF section cards */}
            {pdfSections.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
                  Sections ({pdfSections.length})
                </div>
                {pdfSections.map((sec, i) => {
                  const isOpen = sectionExpanded[i];
                  const isTranslating = sectionTranslating[i];
                  const translated = sectionTranslations[i];
                  return (
                    <div key={i} style={{
                      background: "#1e293b", border: `1px solid ${isOpen ? "#7c3aed" : "#334155"}`,
                      borderRadius: 8, overflow: "hidden",
                    }}>
                      {/* Section header row */}
                      <div
                        onClick={() => setSectionExpanded(p => ({ ...p, [i]: !p[i] }))}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 11px", cursor: "pointer",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
                          <span style={{ color: "#7c3aed", marginRight: 6 }}>§{sec.number}</span>
                          {sec.title}
                        </div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {translated && (
                            <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 600 }}>✓ EN</span>
                          )}
                          <span style={{ color: "#64748b", fontSize: 13 }}>{isOpen ? "▲" : "▼"}</span>
                        </div>
                      </div>

                      {/* Expanded body */}
                      {isOpen && (
                        <div style={{ borderTop: "1px solid #334155", padding: "10px 11px" }}>
                          {/* Translate button row */}
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <button
                              disabled={isTranslating || !!translated}
                              onClick={async () => {
                                setSectionTranslating(p => ({ ...p, [i]: true }));
                                try {
                                  const origLines = splitLines(sec.text);
                                  const res = await api.post("/admin/pdf/translate-section", { lines: origLines });
                                  if (res.data.ok) { setSectionTranslations(p => ({ ...p, [i]: res.data.translatedLines })); addUsage(res.data.usage); }
                                } catch {}
                                setSectionTranslating(p => ({ ...p, [i]: false }));
                              }}
                              style={{
                                background: translated ? "#14532d" : isTranslating ? "#334155" : "#1e40af",
                                color: "#fff", border: "none", borderRadius: 5,
                                padding: "4px 12px", fontSize: 11, fontWeight: 600,
                                cursor: (isTranslating || !!translated) ? "not-allowed" : "pointer",
                              }}
                            >
                              {translated ? "✓ Translated" : isTranslating ? "Translating..." : "Translate to English"}
                            </button>
                            {translated && (
                              <button
                                onClick={() => setSectionTranslations(p => ({ ...p, [i]: null }))}
                                style={{
                                  background: "transparent", color: "#64748b",
                                  border: "1px solid #334155", borderRadius: 5,
                                  padding: "3px 8px", fontSize: 10, cursor: "pointer",
                                }}
                              >
                                Retranslate
                              </button>
                            )}
                          </div>

                          {/* Line-by-line side-by-side */}
                          {(() => {
                            const origLines = splitLines(sec.text);
                            // translated is now a pre-aligned string[] from the backend
                            const transLines = Array.isArray(translated) ? translated : [];
                            return (
                              <div style={{ border: "1px solid #334155", borderRadius: 6, overflow: "hidden" }}>
                                {/* Column headers */}
                                <div style={{ display: "flex", background: "#0f172a", borderBottom: "1px solid #334155" }}>
                                  <div style={{ flex: 1, padding: "5px 10px", borderRight: "1px solid #334155", fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Original</div>
                                  <div style={{ flex: 1, padding: "5px 10px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: translated ? "#22c55e" : isTranslating ? "#f59e0b" : "#334155" }}>
                                    {isTranslating ? "Translating…" : "English"}
                                  </div>
                                </div>
                                {/* One row per original line */}
                                {origLines.map((oLine, li) => {
                                  const tLine = transLines[li] ?? "";
                                  const blank = !oLine.trim();
                                  return (
                                    <div key={li} style={{
                                      display: "flex",
                                      borderBottom: li < origLines.length - 1 ? "1px solid #1e2a3a" : "none",
                                      background: li % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                                    }}>
                                      <div style={{ flex: 1, padding: blank ? "3px 10px" : "5px 10px", borderRight: "1px solid #334155", fontSize: 11, color: "#94a3b8", lineHeight: 1.65, wordBreak: "break-word" }}>
                                        {oLine}
                                      </div>
                                      <div style={{ flex: 1, padding: blank ? "3px 10px" : "5px 10px", fontSize: 11, lineHeight: 1.65, wordBreak: "break-word", background: translated && !blank ? "#0c2016" : "transparent" }}>
                                        {isTranslating ? (
                                          blank ? null : <span style={{ color: "#334155" }}>—</span>
                                        ) : translated ? (
                                          <span style={{ color: "#d1fae5" }}>{tLine}</span>
                                        ) : (
                                          !blank && li === 0
                                            ? <span style={{ color: "#334155", fontStyle: "italic", fontSize: 10 }}>Click "Translate to English"</span>
                                            : null
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Drive search results */}
            {driveResults && driveResults.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {driveResults.map(f => (
                  <div key={f.id} style={{
                    background: "#1e293b", border: "1px solid #334155",
                    borderRadius: 8, padding: "8px 12px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        📄 {f.name}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{f.size} · {f.modified}</div>
                    </div>
                    <a
                      href={f.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#2563eb", color: "#fff", border: "none",
                        borderRadius: 6, padding: "5px 10px", cursor: "pointer",
                        fontSize: 11, fontWeight: 600, textDecoration: "none", flexShrink: 0,
                      }}
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Firestore search results */}
            {firestoreResults && firestoreResults.total > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { key: "batch", label: "Batch Records", color: "#0e7490" },
                  { key: "sds",   label: "SDS Records",   color: "#7c3aed" },
                  { key: "dq",    label: "DQ Records",    color: "#b45309" },
                ].map(({ key, label, color }) => {
                  const rows = firestoreResults[key] || [];
                  if (!rows.length) return null;
                  return (
                    <div key={key}>
                      <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
                        {label} ({rows.length})
                      </div>
                      {rows.map((r, i) => {
                        const cardKey = `${key}-${i}`;
                        const isExpanded = expandedSds === cardKey;
                        const d = r.detail || {};
                        return (
                          <div key={i} style={{
                            background: "#1e293b", border: `1px solid ${isExpanded ? color : "#334155"}`,
                            borderRadius: 8, padding: "8px 11px", marginBottom: 5,
                            fontSize: 12, color: "#f1f5f9", lineHeight: 1.6,
                          }}>
                            {/* Card header row */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: "#e2e8f0" }}>
                                  {key === "batch" ? "MAT" : key === "sds" ? "Repo" : "SDS"}: {r.id}
                                </div>
                                <div style={{ color: "#94a3b8", fontSize: 11 }}>
                                  {r.chemical !== "—" && <span>Chemical: {r.chemical}  </span>}
                                  {r.manufacturer && r.manufacturer !== "—" && <span>Mfr: {r.manufacturer}  </span>}
                                </div>
                                <div style={{ color: "#64748b", fontSize: 11 }}>
                                  Sheet: {r.sheet}
                                  {key === "batch" && <span>  ·  Status: {r.status}  ·  Assigned: {r.assignedTo}</span>}
                                  {key === "sds"   && <span>  ·  Stage: {r.stage}</span>}
                                  {key === "dq"    && <span>  ·  Status: {r.status}  ·  Assigned: {r.assignedTo}</span>}
                                </div>
                              </div>
                              {key === "sds" && (
                                <button
                                  onClick={() => setExpandedSds(isExpanded ? null : cardKey)}
                                  style={{
                                    background: isExpanded ? color : "#334155",
                                    color: "#fff", border: "none", borderRadius: 5,
                                    padding: "3px 9px", fontSize: 11, cursor: "pointer",
                                    flexShrink: 0, marginLeft: 8, fontWeight: 600,
                                  }}
                                >
                                  {isExpanded ? "Close" : "View"}
                                </button>
                              )}
                            </div>

                            {/* Expanded SDS detail */}
                            {key === "sds" && isExpanded && (
                              <div style={{ marginTop: 10, borderTop: "1px solid #334155", paddingTop: 10 }}>
                                {/* Common info */}
                                <div style={{ color: "#7c3aed", fontWeight: 700, fontSize: 11, marginBottom: 5, textTransform: "uppercase" }}>Common Info</div>
                                {[
                                  ["Business Entity", d.businessEntity],
                                  ["Repository No.", d.repositoryNumber],
                                  ["Chemical Product", d.chemicalProduct],
                                  ["Manufacturer", d.manufacturerName],
                                  ["Revision Date", d.revisionDate],
                                  ["Verification Date", d.verificationDate],
                                ].map(([lbl, val]) => val && val !== "—" ? (
                                  <div key={lbl} style={{ display: "flex", gap: 6, fontSize: 11, marginBottom: 2 }}>
                                    <span style={{ color: "#64748b", minWidth: 110 }}>{lbl}:</span>
                                    <span style={{ color: "#e2e8f0" }}>{val}</span>
                                  </div>
                                ) : null)}

                                {/* Per-stage sections */}
                                {[
                                  { name: "Search",        data: d.search },
                                  { name: "Supersede",     data: d.supersede },
                                  { name: "Transcription", data: d.transcription },
                                  { name: "Billing",       data: d.billing },
                                ].map(({ name, data }) => {
                                  if (!data) return null;
                                  const fields = Object.entries(data).filter(([, v]) => v && v !== "—" && v !== "No");
                                  if (!fields.length) return null;
                                  return (
                                    <div key={name} style={{ marginTop: 8 }}>
                                      <div style={{ color: "#7c3aed", fontWeight: 700, fontSize: 11, marginBottom: 4, textTransform: "uppercase" }}>{name}</div>
                                      {fields.map(([k, v]) => (
                                        <div key={k} style={{ display: "flex", gap: 6, fontSize: 11, marginBottom: 2 }}>
                                          <span style={{ color: "#64748b", minWidth: 110, textTransform: "capitalize" }}>{k.replace(/([A-Z])/g, " $1").trim()}:</span>
                                          <span style={{ color: "#e2e8f0", wordBreak: "break-word" }}>{String(v)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Download prompt after report — admin only */}
            {showDownload && isAdmin && (
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-start", flexWrap: "wrap" }}>
                <span style={{ fontSize: 12, color: "#94a3b8", alignSelf: "center" }}>Download as PDF:</span>
                {["today", "week", "month"].map(p => (
                  <button key={p} onClick={() => downloadReport(p)} style={{
                    background: "#1e40af", color: "#fff", border: "none",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                  }}>
                    📥 {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Token usage bar */}
          {tokenUsage.total > 0 && (
            <div style={{
              padding: "4px 12px", background: "#0a1628",
              borderTop: "1px solid #1e293b",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 10, color: "#475569",
            }}>
              <span>Session tokens</span>
              <span style={{ display: "flex", gap: 10 }}>
                <span title="Prompt tokens">↑ {tokenUsage.prompt.toLocaleString()}</span>
                <span title="Completion tokens">↓ {tokenUsage.completion.toLocaleString()}</span>
                <span style={{ color: "#7c3aed", fontWeight: 700 }} title="Total tokens">∑ {tokenUsage.total.toLocaleString()}</span>
              </span>
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: "10px 12px", borderTop: "1px solid #1e293b",
            display: "flex", gap: 8, alignItems: "flex-end", background: "#0f172a",
          }}>
            <input type="file" accept="application/pdf" ref={fileRef}  onChange={handlePDF}     style={{ display: "none" }} />
            <input type="file" accept="application/pdf" ref={scanRef} onChange={handleSDSScan} style={{ display: "none" }} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              title="Upload PDF for section translation"
              style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "7px 10px", cursor: loading ? "not-allowed" : "pointer", fontSize: 16, flexShrink: 0 }}
            >📎</button>
            <button
              onClick={() => scanRef.current?.click()}
              disabled={loading}
              title="SDS Scanner — extract all template fields (manufacturer, GHS, composition…)"
              style={{ background: "#1e293b", border: "1px solid #d97706", borderRadius: 8, padding: "7px 10px", cursor: loading ? "not-allowed" : "pointer", fontSize: 16, flexShrink: 0 }}
            >🔬</button>

            <textarea
              rows={1}
              value={input2}
              onChange={e => setInput2(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about records, stats, reports..."
              disabled={loading}
              style={{
                flex: 1, resize: "none",
                border: "1px solid #334155", borderRadius: 8,
                padding: "8px 10px", fontSize: 13, outline: "none",
                fontFamily: "inherit", lineHeight: 1.4,
                background: "#1e293b", color: "#f1f5f9",
              }}
            />

            <button
              onClick={handleSend}
              disabled={loading || !input2.trim()}
              style={{
                background: "#2563eb", color: "#fff", border: "none",
                borderRadius: 8, padding: "8px 13px",
                cursor: loading || !input2.trim() ? "not-allowed" : "pointer",
                fontWeight: 600, fontSize: 13, flexShrink: 0,
                opacity: loading || !input2.trim() ? 0.6 : 1,
              }}
            >
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
