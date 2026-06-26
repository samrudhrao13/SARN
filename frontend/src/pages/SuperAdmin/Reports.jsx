import React, { useState } from "react";
import api from "../../config/apiClient";

const BACKEND = import.meta.env.VITE_API_URL || "https://sarn-backend-862276535294.asia-south1.run.app";

const PERIOD_LABEL = { today: "Today (IST)", week: "Last 7 Days", month: "This Month" };

function fmtDate(str) {
  if (!str) return "";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STAGE_COLORS = {
  search:        { bg: "#eff6ff", text: "#1d4ed8" },
  supersede:     { bg: "#fefce8", text: "#b45309" },
  transcription: { bg: "#f0fdf4", text: "#15803d" },
  billing:       { bg: "#fdf4ff", text: "#7e22ce" },
};

export default function SuperAdminReports() {
  const [period, setPeriod]       = useState("week");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState("");
  const [activeLabel, setActiveLabel] = useState("Last 7 Days");
  const [sds, setSds]             = useState(null);
  const [dq, setDq]               = useState(null);
  const [batch, setBatch]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [error, setError]         = useState("");

  // SDS section
  const [sdsUserFilter, setSdsUserFilter]   = useState("");
  const [sdsSheetFilter, setSdsSheetFilter] = useState("");
  const [sdsExpandedE, setSdsExpandedE]     = useState(new Set());
  const [sdsExpandedML, setSdsExpandedML]   = useState(new Set());

  // DQ section
  const [dqUserFilter, setDqUserFilter]   = useState("");
  const [dqSheetFilter, setDqSheetFilter] = useState("");
  const [dqExpanded, setDqExpanded]       = useState(new Set());

  // Batch section
  const [batchUserFilter, setBatchUserFilter]   = useState("");
  const [batchSheetFilter, setBatchSheetFilter] = useState("");
  const [batchExpanded, setBatchExpanded]       = useState(new Set());

  // Consolidated section
  const [consolUserFilter, setConsolUserFilter]   = useState("");
  const [consolSheetFilter, setConsolSheetFilter] = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    setSdsExpandedE(new Set()); setSdsExpandedML(new Set());
    setDqExpanded(new Set());
    setBatchExpanded(new Set());
    setSdsUserFilter(""); setSdsSheetFilter("");
    setDqUserFilter("");  setDqSheetFilter("");
    setBatchUserFilter(""); setBatchSheetFilter("");
    setConsolUserFilter(""); setConsolSheetFilter("");
    const usingCustom = fromDate && toDate;
    const params = usingCustom ? { fromDate, toDate } : { period };
    const label  = usingCustom
      ? `${fmtDate(fromDate)} – ${fmtDate(toDate)}`
      : (PERIOD_LABEL[period] || period);
    setActiveLabel(label);
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get("/admin/sds/reports-data",   { params }),
        api.get("/admin/dq/reports-data",    { params }),
        api.get("/admin/batch/reports-data", { params }),
      ]);
      setSds(r1.data.ok   ? r1.data : null);
      setDq(r2.data.ok    ? r2.data : null);
      setBatch(r3.data.ok ? r3.data : null);
      if (!r1.data.ok && !r2.data.ok && !r3.data.ok) setError("Failed to load report data");
    } catch {
      setError("Backend connection failed");
    }
    setLoading(false);
  }

  function downloadPDF() {
    setDlLoading(true);
    const a = document.createElement("a");
    a.href = `${BACKEND}/admin/report/superadmin-pdf?period=${period}`;
    a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
    setTimeout(() => setDlLoading(false), 2000);
  }

  function toggleSet(setter, key) {
    setter(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function dlUserPDF(uid) {
    window.open(`${api.defaults.baseURL}/admin/report/user-detail?userId=${uid}&period=${period}`, "_blank");
  }

  // ── Totals ──
  const sdsT   = sds?.totals   || {};
  const dqT    = dq?.totals    || {};
  const batchT = batch?.totals || {};

  // ── SDS rows ──
  const sdsAllRows = sds?.rows  || [];
  const sdsUsers   = sds?.users || [];
  const sdsSheets  = [...new Set(sdsAllRows.map(r => r.sheetId))].filter(Boolean).sort();
  const sdsFiltered = sdsAllRows
    .filter(r => !sdsUserFilter  || r.userId  === sdsUserFilter)
    .filter(r => !sdsSheetFilter || r.sheetId === sdsSheetFilter);
  // Users available for selected sheet
  const sdsUsersForSheet = sdsSheetFilter
    ? new Set(sdsAllRows.filter(r => r.sheetId === sdsSheetFilter).map(r => r.userId))
    : null;
  const sdsUsersFiltered = sdsUsersForSheet
    ? sdsUsers.filter(u => sdsUsersForSheet.has(u.userId))
    : sdsUsers;

  // ── DQ rows ──
  const dqAllRows = dq?.rows  || [];
  const dqUsers   = dq?.users || [];
  const dqSheets  = [...new Set(dqAllRows.map(r => r.sheetId))].filter(Boolean).sort();
  const dqFiltered = dqAllRows
    .filter(r => !dqUserFilter  || r.userId  === dqUserFilter)
    .filter(r => !dqSheetFilter || r.sheetId === dqSheetFilter);
  const dqUsersForSheet = dqSheetFilter
    ? new Set(dqAllRows.filter(r => r.sheetId === dqSheetFilter).map(r => r.userId))
    : null;
  const dqUsersFiltered = dqUsersForSheet
    ? dqUsers.filter(u => dqUsersForSheet.has(u.userId))
    : dqUsers;

  // ── Batch rows ──
  const batchAllRows = batch?.rows  || [];
  const batchUsers   = batch?.users || [];
  const batchSheets  = [...new Set(batchAllRows.map(r => r.sheetId))].filter(Boolean).sort();
  const batchFiltered = batchAllRows
    .filter(r => !batchUserFilter  || r.userId  === batchUserFilter)
    .filter(r => !batchSheetFilter || r.sheetId === batchSheetFilter);
  const batchUsersForSheet = batchSheetFilter
    ? new Set(batchAllRows.filter(r => r.sheetId === batchSheetFilter).map(r => r.userId))
    : null;
  const batchUsersFiltered = batchUsersForSheet
    ? batchUsers.filter(u => batchUsersForSheet.has(u.userId))
    : batchUsers;

  // ── Consolidated user list (union from all 3) ──
  const consolUsersMap = {};
  [...sdsUsers, ...dqUsers, ...batchUsers].forEach(u => {
    if (!consolUsersMap[u.userId]) consolUsersMap[u.userId] = u;
  });
  const consolUsers = Object.values(consolUsersMap).sort((a, b) => a.name.localeCompare(b.name));
  const consolSheets = [...new Set([...sdsAllRows, ...dqAllRows, ...batchAllRows].map(r => r.sheetId))].filter(Boolean).sort();
  const consolUsersForSheet = consolSheetFilter
    ? new Set([...sdsAllRows, ...dqAllRows, ...batchAllRows].filter(r => r.sheetId === consolSheetFilter).map(r => r.userId))
    : null;
  const consolUsersFiltered = consolUsersForSheet
    ? consolUsers.filter(u => consolUsersForSheet.has(u.userId))
    : consolUsers;

  // ── Consolidated table rows ──
  const combMap = {};
  function getComb(uid, sheetId, name) {
    const k = `${uid}|||${sheetId}`;
    if (!combMap[k]) combMap[k] = { uid, name, sheetId, sdsSearch: 0, sdsSupersede: 0, sdsTrans: 0, sdsBilling: 0, dq: 0, batch: 0 };
    return combMap[k];
  }
  const consolSdsRows = sdsAllRows
    .filter(r => !consolUserFilter  || r.userId  === consolUserFilter)
    .filter(r => !consolSheetFilter || r.sheetId === consolSheetFilter);
  const consolDqRows = dqAllRows
    .filter(r => !consolUserFilter  || r.userId  === consolUserFilter)
    .filter(r => !consolSheetFilter || r.sheetId === consolSheetFilter);
  const consolBatchRows = batchAllRows
    .filter(r => !consolUserFilter  || r.userId  === consolUserFilter)
    .filter(r => !consolSheetFilter || r.sheetId === consolSheetFilter);

  consolSdsRows.forEach(r => {
    const c = getComb(r.userId, r.sheetId, r.name);
    c.sdsSearch    = (r.searchE||0)        + (r.searchML||0);
    c.sdsSupersede = (r.supersedeE||0)     + (r.supersedeML||0);
    c.sdsTrans     = (r.transcriptionE||0) + (r.transcriptionML||0);
    c.sdsBilling   = (r.billingE||0)       + (r.billingML||0);
  });
  consolDqRows.forEach(r => {
    const c = getComb(r.userId, r.sheetId, r.name);
    c.dq = r.totalCompleted || 0;
  });
  consolBatchRows.forEach(r => {
    const c = getComb(r.userId, r.sheetId, r.name);
    c.batch = r.completed || 0;
  });

  const combinedRows = Object.values(combMap)
    .map(c => ({ ...c, grand: c.sdsSearch + c.sdsSupersede + c.sdsTrans + c.sdsBilling + c.dq + c.batch }))
    .filter(c => c.grand > 0)
    .sort((a, b) => b.grand - a.grand || a.name.localeCompare(b.name));

  const hasData     = sds || dq || batch;
  const periodLabel = activeLabel;
  const today       = new Date().toISOString().split("T")[0];

  return (
    <>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Executive Reports
      </h2>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
        Distributed counts per user per business — SDS, DQ and Batch.
      </p>

      {/* ── Control Card ── */}
      <div style={controlCard}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>

          {/* Period select */}
          <div>
            <div style={labelStyle}>Period</div>
            <select
              value={period}
              onChange={e => { setPeriod(e.target.value); setFromDate(""); setToDate(""); }}
              style={{ ...sel, opacity: (fromDate && toDate) ? 0.45 : 1 }}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Divider */}
          <div style={{ paddingBottom: 10, color: "#94a3b8", fontSize: 12, fontWeight: 600 }}>— or —</div>

          {/* Date range */}
          <div>
            <div style={labelStyle}>From Date</div>
            <input
              type="date"
              value={fromDate}
              max={toDate || today}
              onChange={e => setFromDate(e.target.value)}
              style={dateSel}
            />
          </div>
          <div>
            <div style={labelStyle}>To Date</div>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              max={today}
              onChange={e => setToDate(e.target.value)}
              style={dateSel}
            />
          </div>

          {/* Clear dates */}
          {(fromDate || toDate) && (
            <div style={{ paddingBottom: 2 }}>
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                style={clearBtn}
              >
                ✕ Clear
              </button>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button onClick={loadReport} disabled={loading} style={primaryBtn}>
              {loading ? "Loading..." : "Load Report"}
            </button>
            <button onClick={downloadPDF} disabled={dlLoading} style={exportBtn}>
              {dlLoading ? "Opening..." : "⬇ Download PDF"}
            </button>
          </div>
        </div>

        {/* Active range hint */}
        {fromDate && toDate && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#2563eb", fontWeight: 600 }}>
            Custom range: {fmtDate(fromDate)} – {fmtDate(toDate)} &nbsp;·&nbsp; Click <b>Load Report</b> to apply
          </div>
        )}
      </div>

      {error && <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: 12 }}>{error}</p>}

      {hasData && (
        <>
          <div style={periodBadge}>{periodLabel}</div>

          {/* ── Top Summary Cards ── */}
          <div style={cardRow}>
            <SummaryCard title="SDS Workflow"   color="#2563eb" rows={[
              { label: "Total Assigned",  value: sdsT.totalAssigned || 0 },
              { label: "Total Completed", value: sdsT.total || 0 },
            ]} />
            <SummaryCard title="DQ Workflow"    color="#7c3aed" rows={[
              { label: "Total Assigned",  value: dqT.totalAssigned || 0 },
              { label: "Total Completed", value: dqT.totalCompleted || 0 },
            ]} />
            <SummaryCard title="Batch Workflow" color="#0891b2" rows={[
              { label: "Total Assigned",  value: batchT.totalAssigned || 0 },
              { label: "Total Completed", value: batchT.totalCompleted || 0 },
            ]} />
            <SummaryCard title="Grand Total"    color="#16a34a" rows={[
              { label: "All Assigned",  value: (sdsT.totalAssigned||0) + (dqT.totalAssigned||0) + (batchT.totalAssigned||0) },
              { label: "All Completed", value: (sdsT.total||0) + (dqT.totalCompleted||0) + (batchT.totalCompleted||0) },
            ]} />
          </div>

          {/* ══════════════════════════════════════
              SDS REPORTS
          ══════════════════════════════════════ */}
          {sds && (
            <WorkflowSection title="SDS Reports" color="#2563eb">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
                <StatCard label="Total Assigned"               value={sdsT.totalAssigned}                                              color="#3b82f6" bg="#eff6ff" />
                <StatCard label="All-Time Completed"           value={sdsT.allTimeTotal}                                               color="#16a34a" bg="#f0fdf4" />
                <StatCard label={`Completed (${periodLabel})`} value={sdsT.total}                                                      color="#0891b2" bg="#ecfeff" />
                <StatCard label="Total Pending"                value={Math.max(0,(sdsT.totalAssigned||0)-(sdsT.allTimeTotal||0))}      color="#f59e0b" bg="#fef3c7" />
                <StatCard label="Search E"                     value={sdsT.searchE}                                                    color="#1d4ed8" bg="#dbeafe" />
                <StatCard label="Search ML"                    value={sdsT.searchML}                                                   color="#7c3aed" bg="#ede9fe" />
                <StatCard label="Trans. E"                     value={sdsT.transcriptionE}                                             color="#15803d" bg="#dcfce7" />
                <StatCard label="Trans. ML"                    value={sdsT.transcriptionML}                                            color="#15803d" bg="#bbf7d0" />
              </div>

              <SheetProgressBars rows={sdsAllRows} assignedKey="totalAssigned" completedKey="allTimeTotal" />

              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select value={sdsSheetFilter} onChange={e => { setSdsSheetFilter(e.target.value); setSdsUserFilter(""); }} style={filterSel}>
                  <option value="">All Sheets</option>
                  {sdsSheets.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={sdsUserFilter} onChange={e => setSdsUserFilter(e.target.value)} style={filterSel}>
                  <option value="">All Users</option>
                  {sdsUsersFiltered.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
                </select>
                {(sdsSheetFilter || sdsUserFilter) && (
                  <button onClick={() => { setSdsSheetFilter(""); setSdsUserFilter(""); }} style={clearFilterBtn}>✕ Clear</button>
                )}
              </div>

              <SDSSectionTable
                title="English Records"
                accentColor="#1d4ed8"
                filtered={sdsFiltered}
                totals={sdsT}
                periodLabel={periodLabel}
                isML={false}
                expandedRows={sdsExpandedE}
                toggleRow={key => toggleSet(setSdsExpandedE, key)}
                dlUserPDF={dlUserPDF}
              />
              <SDSSectionTable
                title="Multi-lingual Records"
                accentColor="#7c3aed"
                filtered={sdsFiltered}
                totals={sdsT}
                periodLabel={periodLabel}
                isML={true}
                expandedRows={sdsExpandedML}
                toggleRow={key => toggleSet(setSdsExpandedML, key)}
                dlUserPDF={dlUserPDF}
              />
            </WorkflowSection>
          )}

          {/* ══════════════════════════════════════
              DQ REPORTS
          ══════════════════════════════════════ */}
          {dq && (
            <WorkflowSection title="DQ Reports" color="#7c3aed">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
                <StatCard label="Total Assigned"               value={dqT.totalAssigned}                                              color="#3b82f6" bg="#eff6ff" />
                <StatCard label="All-Time Completed"           value={dqT.allTimeCompleted}                                           color="#16a34a" bg="#f0fdf4" />
                <StatCard label={`Completed (${periodLabel})`} value={dqT.totalCompleted}                                             color="#0891b2" bg="#ecfeff" />
                <StatCard label="Total Pending"                value={Math.max(0,(dqT.totalAssigned||0)-(dqT.allTimeCompleted||0))}   color="#f59e0b" bg="#fef3c7" />
                <StatCard label="Active Users"                 value={new Set(dqFiltered.map(r => r.userId)).size}                    color="#8b5cf6" bg="#ede9fe" />
              </div>

              <SheetProgressBars rows={dqAllRows} assignedKey="totalAssigned" completedKey="allTimeCompleted" />

              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select value={dqSheetFilter} onChange={e => { setDqSheetFilter(e.target.value); setDqUserFilter(""); }} style={filterSel}>
                  <option value="">All Sheets</option>
                  {dqSheets.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={dqUserFilter} onChange={e => setDqUserFilter(e.target.value)} style={filterSel}>
                  <option value="">All Users</option>
                  {dqUsersFiltered.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
                </select>
                {(dqSheetFilter || dqUserFilter) && (
                  <button onClick={() => { setDqSheetFilter(""); setDqUserFilter(""); }} style={clearFilterBtn}>✕ Clear</button>
                )}
              </div>

              <DQTable
                filtered={dqFiltered}
                periodLabel={periodLabel}
                expandedRows={dqExpanded}
                toggleRow={key => toggleSet(setDqExpanded, key)}
              />
            </WorkflowSection>
          )}

          {/* ══════════════════════════════════════
              BATCH REPORTS
          ══════════════════════════════════════ */}
          {batch && (
            <WorkflowSection title="Batch Reports" color="#0891b2">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
                <StatCard label="Total Assigned"               value={batchT.totalAssigned}                                              color="#3b82f6" bg="#eff6ff" />
                <StatCard label="All-Time Completed"           value={batchT.allTimeCompleted}                                           color="#16a34a" bg="#f0fdf4" />
                <StatCard label={`Completed (${periodLabel})`} value={batchT.totalCompleted}                                             color="#0891b2" bg="#ecfeff" />
                <StatCard label="Total Pending"                value={Math.max(0,(batchT.totalAssigned||0)-(batchT.allTimeCompleted||0))} color="#f59e0b" bg="#fef3c7" />
                <StatCard label="Active Users"                 value={new Set(batchFiltered.map(r => r.userId)).size}                    color="#8b5cf6" bg="#ede9fe" />
              </div>

              <SheetProgressBars rows={batchAllRows} assignedKey="assigned" completedKey="allTimeCompleted" />

              <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
                <select value={batchSheetFilter} onChange={e => { setBatchSheetFilter(e.target.value); setBatchUserFilter(""); }} style={filterSel}>
                  <option value="">All Sheets</option>
                  {batchSheets.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={batchUserFilter} onChange={e => setBatchUserFilter(e.target.value)} style={filterSel}>
                  <option value="">All Users</option>
                  {batchUsersFiltered.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
                </select>
                {(batchSheetFilter || batchUserFilter) && (
                  <button onClick={() => { setBatchSheetFilter(""); setBatchUserFilter(""); }} style={clearFilterBtn}>✕ Clear</button>
                )}
              </div>

              <BatchTable
                filtered={batchFiltered}
                periodLabel={periodLabel}
                expandedRows={batchExpanded}
                toggleRow={key => toggleSet(setBatchExpanded, key)}
                dlUserPDF={dlUserPDF}
              />
            </WorkflowSection>
          )}

          {/* ══════════════════════════════════════
              CONSOLIDATED PER USER
          ══════════════════════════════════════ */}
          {(sds || dq || batch) && (
            <WorkflowSection title="Consolidated Per User" color="#16a34a">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <select value={consolSheetFilter} onChange={e => { setConsolSheetFilter(e.target.value); setConsolUserFilter(""); }} style={filterSel}>
                  <option value="">All Sheets</option>
                  {consolSheets.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
                <select value={consolUserFilter} onChange={e => setConsolUserFilter(e.target.value)} style={filterSel}>
                  <option value="">All Users</option>
                  {consolUsersFiltered.map(u => <option key={u.userId} value={u.userId}>{u.name}</option>)}
                </select>
                {(consolSheetFilter || consolUserFilter) && (
                  <button onClick={() => { setConsolSheetFilter(""); setConsolUserFilter(""); }} style={clearFilterBtn}>✕ Clear</button>
                )}
                <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
                  {new Set(combinedRows.map(r => r.uid)).size} user{combinedRows.length !== 1 ? "s" : ""} · {combinedRows.length} row{combinedRows.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div style={tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                      <th style={th}>#</th>
                      <th style={th}>User</th>
                      <th style={th}>Business</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Search</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Supr.</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Trans.</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Billing</th>
                      <th style={{ ...th, textAlign: "center" }}>DQ</th>
                      <th style={{ ...th, textAlign: "center" }}>Batch</th>
                      <th style={{ ...th, textAlign: "center" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedRows.length === 0 && (
                      <tr><td colSpan={10} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No data for this period</td></tr>
                    )}
                    {combinedRows.map((c, i) => (
                      <tr key={`${c.uid}|||${c.sheetId}`} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center", width: 36 }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                        <td style={td}><span style={sheetBadge}>{(c.sheetId || "").replace(/_/g, " ")}</span></td>
                        <td style={{ ...td, textAlign: "center" }}>{c.sdsSearch    || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{c.sdsSupersede || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{c.sdsTrans     || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{c.sdsBilling   || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{c.dq           || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{c.batch        || "—"}</td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#1d4ed8" }}>{c.grand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WorkflowSection>
          )}
        </>
      )}

      {!hasData && !loading && (
        <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Select a period and click <b>Load Report</b> to view consolidated counts.
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SHEET PROGRESS BARS
══════════════════════════════════════════════════════ */

function SheetProgressBars({ rows, assignedKey = "totalAssigned", completedKey = "allTimeTotal" }) {
  const sheetMap = {};
  rows.forEach(row => {
    const sid = row.sheetId;
    if (!sheetMap[sid]) sheetMap[sid] = { assigned: 0, completed: 0 };
    sheetMap[sid].assigned  += row[assignedKey]  || 0;
    sheetMap[sid].completed += row[completedKey] || 0;
  });
  const sheets = Object.entries(sheetMap).map(([id, v]) => ({
    id, label: id.replace(/_/g, " "),
    assigned: v.assigned,
    completed: v.completed,
    pending: Math.max(0, v.assigned - v.completed),
    pct: v.assigned ? Math.round((v.completed / v.assigned) * 100) : 0,
  })).sort((a, b) => b.assigned - a.assigned).filter(s => s.pending > 0);

  if (sheets.length === 0) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
        Business Completion Progress
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
        {sheets.map(s => (
          <div key={s.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{s.label}</span>
              <span style={{ fontWeight: 800, fontSize: 16, color: s.pct >= 80 ? "#16a34a" : s.pct >= 50 ? "#d97706" : "#dc2626" }}>{s.pct}%</span>
            </div>
            <div style={{ height: 10, background: "#e2e8f0", borderRadius: 5, overflow: "hidden", marginBottom: 6 }}>
              <div style={{
                width: `${s.pct}%`, height: "100%", borderRadius: 5,
                background: s.pct >= 80 ? "#16a34a" : s.pct >= 50 ? "#f59e0b" : "#dc2626",
                transition: "width 0.4s ease",
              }} />
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#64748b" }}>
              <span>{s.assigned} total</span>
              <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ {s.completed} done</span>
              <span style={{ color: "#dc2626", fontWeight: 600 }}>⏳ {s.pending} pending</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   WORKFLOW SECTION WRAPPER
══════════════════════════════════════════════════════ */

function WorkflowSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, paddingBottom: 8, borderBottom: `3px solid ${color}` }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SDS SECTION TABLE  (English or ML)
══════════════════════════════════════════════════════ */

function SDSSectionTable({ title, accentColor, filtered, totals: t, periodLabel, isML, expandedRows, toggleRow, dlUserPDF }) {
  const COLS = 11;
  const sk = isML
    ? { search: "searchML", supersede: "supersedeML", transcription: "transcriptionML", billing: "billingML" }
    : { search: "searchE",  supersede: "supersedeE",  transcription: "transcriptionE",  billing: "billingE"  };
  const stageLabels = isML
    ? ["Srch ML", "Supr ML", "Trans ML", "Bill ML"]
    : ["Srch E",  "Supr E",  "Trans E",  "Bill E" ];
  const uniqueUserCount = new Set(filtered.map(r => r.userId)).size;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${accentColor}22` }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: accentColor }}>{title}</h4>
        <span style={{ fontSize: 12, color: "#64748b" }}>
          {filtered.length} row{filtered.length !== 1 ? "s" : ""} · {uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f172a", color: "#fff" }}>
              <Th>User</Th>
              <Th>Business (Sheet)</Th>
              <Th center>Assigned</Th>
              <Th center>Prev. Completed</Th>
              <Th center>Completed ({periodLabel})</Th>
              <Th center>Total Pending</Th>
              {stageLabels.map(l => <Th key={l} center>{l}</Th>)}
              <Th center>PDF</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 && (
              <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 13 }}>
                <td style={{ padding: "8px 12px" }} colSpan={2}>
                  TOTAL ({uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}, {filtered.length} row{filtered.length !== 1 ? "s" : ""})
                </td>
                <Num v={t.totalAssigned} />
                <Num v={(t.allTimeTotal||0) - (t.total||0)} prev />
                <Num v={t.total} bold />
                <Num v={Math.max(0,(t.totalAssigned||0)-(t.allTimeTotal||0))} pending />
                <Num v={t[sk.search]}        ml={isML} />
                <Num v={t[sk.supersede]}     ml={isML} />
                <Num v={t[sk.transcription]} ml={isML} />
                <Num v={t[sk.billing]}       ml={isML} />
                <td />
              </tr>
            )}
            {filtered.length === 0 && (
              <tr><td colSpan={COLS} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No data available</td></tr>
            )}

            {filtered.map((row, i) => {
              const key           = `${row.userId}|||${row.sheetId}`;
              const sheetLabel    = (row.sheetId || "").replace(/_/g, " ");
              const prevCompleted = Math.max(0, (row.allTimeTotal || 0) - (row.total || 0));
              const totalPending  = Math.max(0, (row.totalAssigned || 0) - (row.allTimeTotal || 0));
              const langRecords   = (row.records || []).filter(r => {
                const l = (r.language || "").toLowerCase();
                return isML ? l !== "english" : l === "english";
              });

              return (
                <React.Fragment key={key}>
                  <tr onClick={() => toggleRow(key)} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}>
                    <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                      <span style={{ marginRight: 6, fontSize: 10, color: "#94a3b8" }}>
                        {expandedRows.has(key) ? "▼" : "▶"}
                      </span>
                      {row.name}
                    </td>
                    <td style={{ padding: "9px 12px" }}><span style={sheetBadge}>{sheetLabel}</span></td>
                    <Num v={row.totalAssigned} />
                    <Num v={prevCompleted} prev />
                    <Num v={row.total} bold />
                    <Num v={totalPending} pending />
                    <Num v={row[sk.search]}        ml={isML} />
                    <Num v={row[sk.supersede]}     ml={isML} />
                    <Num v={row[sk.transcription]} ml={isML} />
                    <Num v={row[sk.billing]}       ml={isML} />
                    <td style={{ textAlign: "center", padding: "6px 10px" }}>
                      <button onClick={e => { e.stopPropagation(); dlUserPDF(row.userId); }} style={btnSmall}>PDF</button>
                    </td>
                  </tr>

                  {expandedRows.has(key) && (
                    <tr>
                      <td colSpan={COLS} style={{ background: "#f1f5f9", padding: "0 16px 16px 32px" }}>
                        <div style={{ marginTop: 12 }}>
                          <strong style={{ fontSize: 13, color: accentColor }}>
                            {isML ? "Multi-lingual" : "English"} Completed Records — {row.name} / {sheetLabel} ({langRecords.length})
                          </strong>
                          <div style={{ overflow: "auto", marginTop: 8 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <thead>
                                <tr style={{ background: "#0f172a", color: "#fff" }}>
                                  {["Ref ID", "Chemical", "Language", "Stage", "Completed At"].map(h => (
                                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {langRecords.length === 0 && (
                                  <tr><td colSpan={5} style={{ padding: 10, color: "#94a3b8", textAlign: "center" }}>
                                    No {isML ? "multi-lingual" : "English"} completed records in this period
                                  </td></tr>
                                )}
                                {langRecords.map((r, j) => (
                                  <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                    <td style={subTd}>{r.refId}</td>
                                    <td style={{ ...subTd, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.chemical || "—"}</td>
                                    <td style={subTd}><span style={langBadgeStyle(r.language)}>{r.language || "—"}</span></td>
                                    <td style={subTd}><span style={{ ...stageBadge, ...STAGE_COLORS[r.stage] }}>{r.stage}</span></td>
                                    <td style={subTd}>
                                      {r.completedAt
                                        ? new Date(r.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })
                                        : "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DQ TABLE
══════════════════════════════════════════════════════ */

function DQTable({ filtered, periodLabel, expandedRows, toggleRow }) {
  const uniqueUserCount = new Set(filtered.map(r => r.userId)).size;
  const filtTotals = filtered.reduce((acc, r) => {
    acc.totalAssigned    += r.totalAssigned    || 0;
    acc.allTimeCompleted += r.allTimeCompleted || 0;
    acc.totalCompleted   += r.totalCompleted   || 0;
    return acc;
  }, { totalAssigned: 0, allTimeCompleted: 0, totalCompleted: 0 });
  const filtPrev    = Math.max(0, filtTotals.allTimeCompleted - filtTotals.totalCompleted);
  const filtPending = Math.max(0, filtTotals.totalAssigned - filtTotals.allTimeCompleted);
  const filtPct     = filtTotals.totalAssigned ? Math.round((filtTotals.allTimeCompleted / filtTotals.totalAssigned) * 100) : 0;

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0f172a", color: "#fff" }}>
            <th style={th}>User</th>
            <th style={th}>Business (Sheet)</th>
            <th style={{ ...th, textAlign: "center" }}>Assigned</th>
            <th style={{ ...th, textAlign: "center" }}>Prev. Completed</th>
            <th style={{ ...th, textAlign: "center" }}>Completed ({periodLabel})</th>
            <th style={{ ...th, textAlign: "center" }}>Total Pending</th>
            <th style={{ ...th, textAlign: "center" }}>% Done</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 && (
            <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 13 }}>
              <td style={{ padding: "8px 12px" }} colSpan={2}>
                TOTAL ({uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}, {filtered.length} row{filtered.length !== 1 ? "s" : ""})
              </td>
              <td style={{ textAlign: "center", padding: 8 }}>{filtTotals.totalAssigned}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#93c5fd" }}>{filtPrev}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#86efac" }}>{filtTotals.totalCompleted}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#fca5a5" }}>{filtPending}</td>
              <td style={{ textAlign: "center", padding: 8 }}>{filtPct}%</td>
            </tr>
          )}
          {filtered.length === 0 && (
            <tr><td colSpan={7} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No data available</td></tr>
          )}

          {filtered.map((row, i) => {
            const key           = `${row.userId}|||${row.sheetId}`;
            const sheetLabel    = (row.sheetId || "").replace(/_/g, " ");
            const prevCompleted = Math.max(0, (row.allTimeCompleted || 0) - (row.totalCompleted || 0));
            const totalPending  = Math.max(0, (row.totalAssigned || 0) - (row.allTimeCompleted || 0));
            const pct           = row.totalAssigned ? Math.round(((row.allTimeCompleted || 0) / row.totalAssigned) * 100) : 0;

            return (
              <React.Fragment key={key}>
                <tr onClick={() => toggleRow(key)} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: 6, fontSize: 10, color: "#94a3b8" }}>
                      {expandedRows.has(key) ? "▼" : "▶"}
                    </span>
                    {row.name}
                  </td>
                  <td style={{ padding: "9px 12px" }}><span style={sheetBadge}>{sheetLabel}</span></td>
                  <td style={{ textAlign: "center", padding: 9, fontWeight: 700 }}>{row.totalAssigned}</td>
                  <td style={{ textAlign: "center", padding: 9, color: "#2563eb", fontWeight: 600 }}>{prevCompleted}</td>
                  <td style={{ textAlign: "center", padding: 9, color: "#16a34a", fontWeight: 600 }}>{row.totalCompleted || 0}</td>
                  <td style={{ textAlign: "center", padding: 9, color: totalPending > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>{totalPending}</td>
                  <td style={{ textAlign: "center", padding: 9 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>

                {expandedRows.has(key) && (
                  <tr>
                    <td colSpan={7} style={{ background: "#f1f5f9", padding: "0 16px 16px 32px" }}>
                      <div style={{ marginTop: 12 }}>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>
                          Completed ({periodLabel}) — {row.name} / {sheetLabel} ({row.records?.length || 0})
                        </strong>
                        <div style={{ overflow: "auto", marginTop: 8 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: "#0f172a", color: "#fff" }}>
                                {["Ref ID", "Chemical", "Completed At"].map(h => (
                                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(row.records || []).length === 0 && (
                                <tr><td colSpan={3} style={{ padding: 10, color: "#94a3b8", textAlign: "center" }}>No records in this period</td></tr>
                              )}
                              {(row.records || []).map((r, j) => (
                                <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                  <td style={subTd}>{r.refId}</td>
                                  <td style={{ ...subTd, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.chemical || "—"}</td>
                                  <td style={subTd}>
                                    {r.completedAt ? new Date(r.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BATCH TABLE
══════════════════════════════════════════════════════ */

function BatchTable({ filtered, periodLabel, expandedRows, toggleRow, dlUserPDF }) {
  const uniqueUserCount = new Set(filtered.map(r => r.userId)).size;
  const filtTotals = filtered.reduce((acc, r) => {
    acc.assigned         += r.assigned         || 0;
    acc.allTimeCompleted += r.allTimeCompleted  || 0;
    acc.completed        += r.completed         || 0;
    return acc;
  }, { assigned: 0, allTimeCompleted: 0, completed: 0 });
  const filtPrev    = Math.max(0, filtTotals.allTimeCompleted - filtTotals.completed);
  const filtPending = Math.max(0, filtTotals.assigned - filtTotals.allTimeCompleted);
  const filtPct     = filtTotals.assigned ? Math.round((filtTotals.allTimeCompleted / filtTotals.assigned) * 100) : 0;

  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0f172a", color: "#fff" }}>
            <th style={th}>User</th>
            <th style={th}>Business (Sheet)</th>
            <th style={{ ...th, textAlign: "center" }}>Assigned</th>
            <th style={{ ...th, textAlign: "center" }}>Prev. Completed</th>
            <th style={{ ...th, textAlign: "center" }}>Completed ({periodLabel})</th>
            <th style={{ ...th, textAlign: "center" }}>Total Pending</th>
            <th style={{ ...th, textAlign: "center" }}>% Done</th>
            <th style={{ ...th, textAlign: "center" }}>PDF</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 && (
            <tr style={{ background: "#1e293b", color: "#fff", fontWeight: 700, fontSize: 13 }}>
              <td style={{ padding: "8px 12px" }} colSpan={2}>
                TOTAL ({uniqueUserCount} user{uniqueUserCount !== 1 ? "s" : ""}, {filtered.length} row{filtered.length !== 1 ? "s" : ""})
              </td>
              <td style={{ textAlign: "center", padding: 8 }}>{filtTotals.assigned}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#93c5fd" }}>{filtPrev}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#86efac" }}>{filtTotals.completed}</td>
              <td style={{ textAlign: "center", padding: 8, color: "#fca5a5" }}>{filtPending}</td>
              <td style={{ textAlign: "center", padding: 8 }}>{filtPct}%</td>
              <td />
            </tr>
          )}
          {filtered.length === 0 && (
            <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No data available</td></tr>
          )}

          {filtered.map((row, i) => {
            const key           = `${row.userId}|||${row.sheetId}`;
            const sheetLabel    = (row.sheetId || "").replace(/_/g, " ");
            const prevCompleted = Math.max(0, (row.allTimeCompleted || 0) - (row.completed || 0));
            const totalPending  = Math.max(0, (row.assigned || 0) - (row.allTimeCompleted || 0));
            const pct           = row.assigned ? Math.round(((row.allTimeCompleted || 0) / row.assigned) * 100) : 0;

            return (
              <React.Fragment key={key}>
                <tr onClick={() => toggleRow(key)} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", cursor: "pointer" }}>
                  <td style={{ padding: "9px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: 6, fontSize: 10, color: "#94a3b8" }}>
                      {expandedRows.has(key) ? "▼" : "▶"}
                    </span>
                    {row.name}
                  </td>
                  <td style={{ padding: "9px 12px" }}><span style={sheetBadge}>{sheetLabel}</span></td>
                  <td style={{ textAlign: "center", padding: 9, fontWeight: 700 }}>{row.assigned}</td>
                  <td style={{ textAlign: "center", padding: 9, color: "#2563eb", fontWeight: 600 }}>{prevCompleted}</td>
                  <td style={{ textAlign: "center", padding: 9, color: "#16a34a", fontWeight: 600 }}>{row.completed || 0}</td>
                  <td style={{ textAlign: "center", padding: 9, color: totalPending > 0 ? "#dc2626" : "#94a3b8", fontWeight: 600 }}>{totalPending}</td>
                  <td style={{ textAlign: "center", padding: 9 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 60, height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center", padding: "6px 10px" }}>
                    <button onClick={e => { e.stopPropagation(); dlUserPDF(row.userId); }} style={btnSmall}>PDF</button>
                  </td>
                </tr>

                {expandedRows.has(key) && (
                  <tr>
                    <td colSpan={8} style={{ background: "#f1f5f9", padding: "0 16px 16px 32px" }}>
                      <div style={{ marginTop: 12 }}>
                        <strong style={{ fontSize: 13, color: "#0f172a" }}>
                          Completed ({periodLabel}) — {row.name} / {sheetLabel} ({row.records?.length || 0})
                        </strong>
                        <div style={{ overflow: "auto", marginTop: 8 }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: "#0f172a", color: "#fff" }}>
                                {["Repository No", "Chemical Name", "Language", "Completed At"].map(h => (
                                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(row.records || []).length === 0 && (
                                <tr><td colSpan={4} style={{ padding: 10, color: "#94a3b8", textAlign: "center" }}>No records in this period</td></tr>
                              )}
                              {(row.records || []).map((r, j) => (
                                <tr key={j} style={{ background: j % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                  <td style={subTd}>{r.repositoryNo || "—"}</td>
                                  <td style={{ ...subTd, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.chemical || "—"}</td>
                                  <td style={subTd}><span style={langBadgeStyle(r.language)}>{r.language || "—"}</span></td>
                                  <td style={subTd}>
                                    {r.completedAt ? new Date(r.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SHARED SMALL COMPONENTS
══════════════════════════════════════════════════════ */

function SummaryCard({ title, color, rows }) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{title}</div>
      {rows.map(r => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>{r.label}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{r.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 8, padding: "12px 16px", minWidth: 0 }}>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value ?? 0}</div>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Th({ children, center }) {
  return (
    <th style={{ padding: "10px 10px", textAlign: center ? "center" : "left", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
      {children}
    </th>
  );
}

function Num({ v, ml, bold, prev, pending }) {
  const color = !v ? "#cbd5e1"
    : pending ? "#dc2626"
    : prev    ? "#2563eb"
    : bold    ? "#0f172a"
    : ml      ? "#7c3aed"
    : "#0f172a";
  return (
    <td style={{ padding: "9px 10px", textAlign: "center", fontWeight: (bold || pending || prev) ? 700 : 400, color }}>
      {v || 0}
    </td>
  );
}

/* ── Styles ── */

function langBadgeStyle(lang) {
  const ml = lang && lang.toLowerCase() !== "english";
  return { display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: ml ? "#ede9fe" : "#dbeafe", color: ml ? "#7c3aed" : "#1d4ed8" };
}

const stageBadge = { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, textTransform: "capitalize" };

const controlCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const labelStyle  = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13 };
const dateSel     = { padding: "7px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontSize: 13, color: "#0f172a", cursor: "pointer" };
const clearBtn    = { padding: "7px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: 13, cursor: "pointer" };
const filterSel      = { padding: "7px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, minWidth: 160 };
const clearFilterBtn = { padding: "7px 14px", borderRadius: 8, border: "1px solid #fca5a5", background: "#fef2f2", color: "#dc2626", fontWeight: 600, fontSize: 12, cursor: "pointer" };
const primaryBtn  = { padding: "8px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 };
const exportBtn   = { padding: "8px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 };
const periodBadge = { display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: 12, marginBottom: 16 };
const cardRow     = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto" };
const th          = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td          = { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const subTd       = { padding: "6px 10px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const sheetBadge  = { display: "inline-block", background: "#e2e8f0", color: "#334155", borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 };
const btnSmall    = { padding: "4px 10px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: "pointer" };
