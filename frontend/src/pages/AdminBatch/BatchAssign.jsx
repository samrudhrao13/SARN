import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function BatchAssign() {
  const [sheets, setSheets]               = useState([]);
  const [sheet, setSheet]                 = useState("");
  const [users, setUsers]                 = useState([]);
  const [assignUser, setAssignUser]       = useState("");
  const [records, setRecords]             = useState([]);
  const [selected, setSelected]           = useState([]);
  const [manufacturer, setManufacturer]   = useState("");
  const [duplicateFilter, setDuplicateFilter] = useState("all");
  const [language, setLanguage]           = useState("");
  const [searchRepo, setSearchRepo]       = useState("");
  const [page, setPage]                   = useState(1);
  const [loading, setLoading]             = useState(false);
  const [msg, setMsg]                     = useState("");

  useEffect(() => { loadUsers(); loadSheets(); }, []);

  async function loadUsers() {
    try {
      const res = await api.get("/users");
      if (res.data.ok)
        setUsers((res.data.users || []).filter(u => u.role === "user"));
    } catch {}
  }

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");
      if (res.data.ok) setSheets(res.data.sheets || []);
    } catch {}
  }

  useEffect(() => {
    if (!sheet) { setRecords([]); return; }
    loadRecords();
  }, [sheet]);

  async function loadRecords() {
    try {
      setLoading(true);
      const res = await api.get("/admin/batch/list", { params: { sheet } });
      if (res.data.ok) setRecords(res.data.rows || []);
    } finally { setLoading(false); }
  }

  /* ── Selection ── */
  const toggle = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectAll       = () => setSelected(pagedRecords.map(r => r.recordId));
  const clearSelection  = () => setSelected([]);
  const selectDuplicates = () =>
    setSelected(filteredRecords.filter(r => r.duplicate).map(r => r.recordId));

  /* ── Assign ── */
  async function assignSelected() {
    if (!sheet)               return setMsg("Select a sheet first");
    if (!assignUser)          return setMsg("Select a user to assign");
    if (selected.length === 0) return setMsg("Select at least one record");
    try {
      setMsg("Assigning…");
      const res = await api.post("/admin/batch/assign", {
        sheet, recordIds: selected, userId: assignUser,
      });
      if (res.data.ok) {
        setMsg(`${selected.length} record(s) assigned successfully`);
        setSelected([]);
        loadRecords();
      }
    } catch { setMsg("Assignment failed"); }
  }

  /* ── Filters ── */
  const manufacturers = [...new Set(records.map(r => r.manufacturerName).filter(Boolean))].sort();
  const languages     = [...new Set(records.map(r => r.language).filter(Boolean))].sort();

  let filteredRecords = [...records];
  if (searchRepo)
    filteredRecords = filteredRecords.filter(r =>
      String(r.newRepository || r.common?.newRepository || "")
        .toLowerCase().includes(searchRepo.trim().toLowerCase())
    );
  if (manufacturer)
    filteredRecords = filteredRecords.filter(r => r.manufacturerName === manufacturer);
  if (language)
    filteredRecords = filteredRecords.filter(r => r.language === language);
  if (duplicateFilter === "duplicates")
    filteredRecords = filteredRecords.filter(r => r.duplicate);
  if (duplicateFilter === "normal")
    filteredRecords = filteredRecords.filter(r => !r.duplicate);

  const totalPages   = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = filteredRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Batch Assignment
      </h2>

      {/* ── Control Card ── */}
      <div style={controlCard}>
        {/* Row 1 — 5 dropdowns side by side */}
        <div style={dropRow}>
          <DropGroup label="Sheet">
            <select
              value={sheet}
              onChange={e => { setSheet(e.target.value); setPage(1); }}
              style={dropSel}
            >
              <option value="">Select Sheet</option>
              {sheets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Assign To">
            <select
              value={assignUser}
              onChange={e => setAssignUser(e.target.value)}
              style={dropSel}
            >
              <option value="">Select User</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.userId}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Manufacturer">
            <select
              value={manufacturer}
              onChange={e => { setManufacturer(e.target.value); setPage(1); }}
              style={dropSel}
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Language">
            <select
              value={language}
              onChange={e => { setLanguage(e.target.value); setPage(1); }}
              style={dropSel}
            >
              <option value="">All Languages</option>
              {languages.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Record Type">
            <select
              value={duplicateFilter}
              onChange={e => { setDuplicateFilter(e.target.value); setPage(1); }}
              style={dropSel}
            >
              <option value="all">All Records</option>
              <option value="duplicates">Duplicates Only</option>
              <option value="normal">Non-Duplicates</option>
            </select>
          </DropGroup>
        </div>

        {/* Row 2 — search + action buttons */}
        <div style={actionRow}>
          <input
            type="text"
            placeholder="Search repository number…"
            value={searchRepo}
            onChange={e => { setSearchRepo(e.target.value); setPage(1); }}
            style={searchInput}
          />
          <button onClick={selectAll}        style={secBtn}>Select All</button>
          <button onClick={selectDuplicates} style={secBtn}>Select Duplicates</button>
          <button onClick={clearSelection}   style={secBtn}>Clear</button>
          <button onClick={assignSelected}   style={assignBtn}>
            Assign Selected{selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div style={msgBox}>{msg}</div>
      )}

      {/* Stats */}
      {records.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${records.length}`}         color="blue"   />
          <Chip label={`Filtered: ${filteredRecords.length}`} color="green"  />
          <Chip label={`Selected: ${selected.length}`}     color="purple" />
          <Chip label={`Page ${page} of ${totalPages}`}    color="gray"   />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading records…</Empty>
        ) : pagedRecords.length === 0 ? (
          <Empty>{records.length === 0 ? "Select a sheet to load records" : "No records match the current filters."}</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  <th style={th}>#</th>
                  <th style={th}>Select</th>
                  <th style={th}>Repo No.</th>
                  <th style={th}>Duplicates</th>
                  <th style={{ ...th, minWidth: 200 }}>Chemical Name</th>
                  <th style={{ ...th, minWidth: 180 }}>Manufacturer</th>
                  <th style={th}>Revision Date</th>
                  <th style={th}>Language</th>
                  <th style={th}>Workflow Status</th>
                  <th style={th}>Assigned To</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pagedRecords.map((r, i) => (
                  <tr
                    key={r.recordId}
                    style={{
                      background: r.duplicate
                        ? "#fff7ed"
                        : i % 2 === 0 ? "#f8fafc" : "#fff",
                    }}
                  >
                    <td style={{ ...td, textAlign: "center", color: "#94a3b8", fontSize: 11 }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {!r.assignedTo && (
                        <input
                          type="checkbox"
                          checked={selected.includes(r.recordId)}
                          onChange={() => toggle(r.recordId)}
                          style={{ cursor: "pointer", width: 15, height: 15 }}
                        />
                      )}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#0f172a" }}>
                      {r.newRepository || r.common?.newRepository || "-"}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {r.duplicate
                        ? <span style={dupBadge}>DUP</span>
                        : <span style={{ color: "#94a3b8" }}>-</span>}
                    </td>
                    <td style={ellTd} title={r.chemicalName}>{r.chemicalName || "-"}</td>
                    <td style={ellTd} title={r.manufacturerName}>{r.manufacturerName || "-"}</td>
                    <td style={td}>{r.revisionDate || "-"}</td>
                    <td style={td}>
                      {r.language
                        ? <span style={langBadge(r.language)}>{r.language}</span>
                        : "-"}
                    </td>
                    <td style={td}>
                      <span style={statusBadge(r.status)}>{r.status || "-"}</span>
                    </td>
                    <td style={td}>
                      {r.assignedTo
                        ? <span style={{ color: "#16a34a", fontWeight: 600 }}>{r.assignedTo}</span>
                        : <span style={{ color: "#94a3b8" }}>Unassigned</span>}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>
                      {r.assignedTo ? (
                        <button
                          onClick={async () => {
                            if (!assignUser) return setMsg("Select a user first");
                            try {
                              setMsg("Reassigning…");
                              const res = await api.post("/admin/batch/assign", {
                                sheet, recordIds: [r.recordId], userId: assignUser,
                              });
                              if (res.data.ok) { setMsg("Reassigned successfully"); loadRecords(); }
                            } catch { setMsg("Reassignment failed"); }
                          }}
                          style={reassignBtn}
                        >
                          Reassign
                        </button>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={pageBar}>
              <button disabled={page === 1}          onClick={() => setPage(p => p - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Page {page} of {totalPages} &nbsp;·&nbsp; {filteredRecords.length} records
              </span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Small components ── */

function DropGroup({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ label, color }) {
  const map = {
    blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
    green:  { bg: "#dcfce7", fg: "#166534" },
    purple: { bg: "#ede9fe", fg: "#7c3aed" },
    gray:   { bg: "#f1f5f9", fg: "#475569" },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}

function Empty({ children }) {
  return <div style={{ padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>{children}</div>;
}

function langBadge(lang) {
  const ml = lang && lang.toLowerCase() !== "english";
  return {
    display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: ml ? "#ede9fe" : "#dbeafe", color: ml ? "#7c3aed" : "#1d4ed8",
  };
}

function statusBadge(status) {
  if (!status || status === "-") return { color: "#94a3b8", fontSize: 12 };
  return { display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#475569" };
}

/* ── Styles ── */
const controlCard = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const dropRow     = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 };
const dropSel     = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, width: "100%", boxSizing: "border-box" };
const actionRow   = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const searchInput = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, flex: "1 1 220px", minWidth: 0 };
const secBtn      = { padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const assignBtn   = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const msgBox      = { padding: "10px 16px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 8, fontWeight: 600, marginBottom: 12, fontSize: 13 };
const statsBar    = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto", height: "calc(100vh - 310px)" };
const th          = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td          = { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, verticalAlign: "middle" };
const ellTd       = { ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const dupBadge    = { padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" };
const reassignBtn = { padding: "5px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
