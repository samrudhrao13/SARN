import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function AdminAssignSDS() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [stageFilter, setStageFilter] = useState("search");

  const [users, setUsers] = useState([]);
  const [assignUser, setAssignUser] = useState("");

  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState("");

  const [manufacturers, setManufacturers] = useState([]);
  const [repositoryNo, setRepositoryNo] = useState("");
  const [searchRepo, setSearchRepo] = useState("");     
  const [manufacturersSelected, setManufacturersSelected] = useState([]);
  const [showManuDropdown, setShowManuDropdown] = useState(false);

  const [refs, setRefs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState("");

  const [reassignRef, setReassignRef] = useState(null);
  const [reassignUser, setReassignUser] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    api.get("/users").then(res => {
      if (res.data.ok) {
        setUsers(res.data.users.filter(u => u.role === "user"));
      }
    });
  }, []);

  /* ================= LOAD SHEETS ================= */
  useEffect(() => {
    api.get("/sds/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  useEffect(() => {
  setCompany("");
  setManufacturersSelected([]);
}, [sheet]);
  /* ================= LOAD BUSINESS ENTITIES ================= */
  useEffect(() => {
    if (!sheet) {
      setCompanies([]);
      setCompany("");
      return;
    }

    api.get("/admin/sds/manufacturers", { params: { sheet } })
      .then(res => setCompanies(res.data.manufacturers || []))
      .catch(() => setCompanies([]));
  }, [sheet]);

  /* ================= LOAD MANUFACTURERS ================= */
  useEffect(() => {
    if (!sheet) {
      setManufacturers([]);
      setManufacturersSelected([]);
      return;
    }

    api.get("/admin/sds/manufacturer-names", { params: { sheet } })
      .then(res => setManufacturers(res.data.manufacturers || []))
      .catch(() => setManufacturers([]));
  }, [sheet]);

  /* ================= RESET PAGE ================= */
  useEffect(() => {
    setPage(1);
  }, [sheet, stageFilter, company, manufacturersSelected]);

  /* ================= LOAD REFERENCES ================= */
useEffect(() => {
  const timer = setTimeout(() => {

    if (!sheet && !repositoryNo) return;

    if (repositoryNo && repositoryNo.length < 5) return;

    setMsg("Loading...");
    setSelected([]);

    const params = {
      sheet,
      stage: stageFilter,
      page,
      pageSize: PAGE_SIZE,
    };

    if (repositoryNo.trim()) {
      params.repositoryNo = repositoryNo.trim();
    }

    if (company) {
      params.company = company;
    }

    if (manufacturersSelected.length > 0) {
      params.manufacturer = manufacturersSelected;
    }

    console.log("REQUEST PARAMS", params);

    api.get("/admin/workflow/list", {
      params,
      paramsSerializer: params => {
        const search = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach(v => search.append(key, v));
          } else if (value !== undefined) {
            search.append(key, value);
          }
        });

        return search.toString();
      },
    })
      .then(res => {
        if (res.data.ok) {
          setRefs(res.data.rows || []);
          setTotal(res.data.total || 0);
          setMsg("");
        } else {
          setRefs([]);
          setMsg("Failed to load");
        }
      })
      .catch(() => {
        setRefs([]);
        setMsg("Failed to load");
      });

  }, 700);

  return () => clearTimeout(timer);

}, [
  sheet,
  stageFilter,
  company,
  manufacturersSelected,
  page,
  repositoryNo
]);
 
  /* ================= MANUFACTURER TOGGLE ================= */
  const toggleManufacturer = m => {
    setManufacturersSelected(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  /* ================= SELECTION ================= */
  const toggle = id =>
    setSelected(p =>
      p.includes(id) ? p.filter(x => x !== id) : [...p, id]
    );

  const selectAll = () => {
    setSelected(
      refs
        .filter(r => !r.assignedTo && r.currentStage === stageFilter)
        .map(r => r.referenceId)
    );
  };

  const validCount = refs.filter(
    r => !r.assignedTo && r.currentStage === stageFilter
  ).length;

  /* ================= ASSIGN SELECTED ================= */
  const assignSelected = async () => {
    if (!sheet || !assignUser || selected.length === 0) {
      setMsg("Select sheet, user & references");
      return;
    }

    setMsg("Assigning selected...");
    await api.post("/admin/workflow/assign-bulk", {
      sheet,
      refIds: selected,
      stage: stageFilter,
      userId: assignUser,
    });

    setSelected([]);
    setMsg("Assignment complete");
  };

  /* ================= CONFIRM REASSIGN ================= */
  const confirmReassign = async () => {
    if (!reassignUser) {
      alert("Select user to reassign");
      return;
    }

    await api.post("/sds/reassign", {
      sheet,
      refId: reassignRef.referenceId,
      newUserId: reassignUser,
      reason: reassignReason,
    });

    setReassignRef(null);
    setReassignUser("");
    setReassignReason("");
    setMsg("Reassigned successfully");
  };

  return (
    <AdminLayout>
      <h1>Assign SDS Workflow</h1>

      {/* ================= CONTROLS ================= */}
      <div style={row}>
        <select value={sheet} onChange={e => setSheet(e.target.value)} style={selectStyle}>
          <option value="">Select Sheet</option>
          {sheets.map(s => <option key={s}>{s}</option>)}
        </select>

        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={selectStyle}>
          <option value="search">Search</option>
          <option value="supersede">Supersede</option>
          <option value="transcription">Transcription</option>
        </select>

        <select value={assignUser} onChange={e => setAssignUser(e.target.value)} style={selectStyle}>
          <option value="">Assign To</option>
          {users.map(u => (
            <option key={u.userId} value={u.userId}>{u.userId}</option>
          ))}
        </select>
      </div>

      {/* ================= FILTERS ================= */}
      <div style={{ ...row, marginBottom: 20 }}>
        <button
          style={secondaryBtn}
          onClick={() => {
            setCompany("");
            setManufacturersSelected([]);
          }}
        >
          Reset Filters
        </button>
        <input
  type="text"
  placeholder="Repository Number"
  value={searchRepo}
  onChange={(e) => setSearchRepo(e.target.value)}
/>

<button
  onClick={() => {
    setRepositoryNo(searchRepo.trim());
    setPage(1);
  }}
>
  Search
</button>
        <select value={company} onChange={e => setCompany(e.target.value)} style={selectStyle}>
          <option value="">Business Entity</option>
          {companies.map(c => <option key={c}>{c}</option>)}
        </select>

        <div style={{ position: "relative" }}>
          <button style={secondaryBtn} onClick={() => setShowManuDropdown(p => !p)}>
            Manufacturer ({manufacturersSelected.length})
          </button>

          {showManuDropdown && (
            <div style={manufacturerDropdown}>
              {manufacturers.map(m => (
                <div
                  key={m}
                  style={{
                    ...manufacturerItem,
                    background: manufacturersSelected.includes(m) ? "#E0E7FF" : "transparent",
                    fontWeight: manufacturersSelected.includes(m) ? 600 : 400,
                  }}
                  onClick={() => toggleManufacturer(m)}
                >
                  {m}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= ACTIONS ================= */}
      <div style={{ marginBottom: 12 }}>
        <button style={secondaryBtn} onClick={selectAll}>
          Select All ({validCount})
        </button>

        <button
          style={{ ...primaryBtn, marginLeft: 10 }}
          onClick={assignSelected}
        >
          Assign Selected ({selected.length})
        </button>
      </div>

      {msg && <p>{msg}</p>}

      {/* ================= TABLE ================= */}
      <table border="1" width="100%" cellPadding="6">
        <thead>
  <tr style={{ background: "#f1f5f9" }}>
    <th>SL No</th>
    <th>Select / Action</th>
    <th>Sheet</th>
    <th>Reference ID</th>
    <th>Business Entity</th>
    <th>Chemical Product</th>

    {stageFilter === "transcription" && (
      <>
        <th>Comments 2</th>
        <th>New Repository Number</th>
      </>
    )}

    <th>Stage</th>
    <th>Status</th>
  </tr>
</thead>
        <tbody>
          {refs.map((r, i) => (
                        <tr
              key={r.referenceId}
              style={{
                background: r.duplicate ? "#FFE4E6" : "white"
              }}
            >
              <td>{(page - 1) * PAGE_SIZE + i + 1}</td>

              <td>
                {!r.assignedTo ? (
                  <input
                    type="checkbox"
                    checked={selected.includes(r.referenceId)}
                    onChange={() => toggle(r.referenceId)}
                  />
                ) : (
                  <button style={linkBtn} onClick={() => setReassignRef(r)}>
                    Reassign
                  </button>
                )}
              </td>
              <td>{r.sheetName || "-"}</td>

              <td>
                {r.referenceId}
                  {r.duplicate && (
                    <span style={{
                      marginLeft: 6,
                      padding: "2px 6px",
                      background: "#EF4444",
                      color: "#fff",
                      borderRadius: 4,
                      fontSize: 11,
                    }}>
                      DUPLICATE
                    </span>
                  )}
                  {r.reassignHistory?.length > 0 && (
                    <span style={{
                      marginLeft: 6,
                      padding: "2px 6px",
                      background: "#F59E0B",
                      color: "#fff",
                      borderRadius: 4,
                      fontSize: 11,
                    }}>
                      REASSIGNED
                    </span>
                  )}
                </td>
              <td>{r.businessEntity || "-"}</td>
              <td>{r.chemicalProduct || "-"}</td>
              {stageFilter === "transcription" && (
  <>
    <td>{r.comments2 || "-"}</td>
    <td>{r.newRepositoryNumber || "-"}</td>
  </>
)}  
              <td>{r.currentStage}</td>
              <td>{r.assignedTo ? "Assigned" : "Assign Pending"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <button
            style={secondaryBtn}
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ◀ Previous
          </button>

          <span style={{ fontWeight: 600 }}>
            Page {page} / {totalPages}
          </span>

          <button
            style={secondaryBtn}
            disabled={page === totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next ▶
          </button>
        </div>
      )}

      {/* ================= REASSIGN MODAL ================= */}
      {reassignRef && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <h3>Reassign Reference</h3>
            <p>
              <b>Reference ID:</b> {reassignRef.referenceId}<br />
              <b>Currently Assigned:</b> {reassignRef.assignedTo}
              <b>Stage:</b> {reassignRef.currentStage}<br />
            </p>

            <select
              value={reassignUser}
              onChange={e => setReassignUser(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select New User</option>

              {users
                .filter(u => u.userId !== reassignRef?.assignedTo) 
                .map(u => (
                  <option key={u.userId} value={u.userId}>
                    {u.userId}
                  </option>
                ))}
            </select>

            <textarea
              placeholder="Reason (Holiday / Emergency)"
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />

            <div style={{ marginTop: 10 }}>
              <button
                style={primaryBtn}
                onClick={confirmReassign}
                disabled={!reassignUser}
              >
                Confirm Reassign
              </button>

              <button
                style={{ ...secondaryBtn, marginLeft: 8 }}
                onClick={() => setReassignRef(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ================= STYLES ================= */

const row = { display: "flex", gap: 10 };

const selectStyle = {
  minWidth: "220px",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
  background: "#F8FAFC",
};

const primaryBtn = {
  padding: "9px 16px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg,#2563EB,#1E40AF)",
  color: "#fff",
  fontWeight: 600,
};

const secondaryBtn = {
  padding: "9px 16px",
  borderRadius: "8px",
  border: "1px solid #64748B",
  background: "#E2E8F0",
  color: "#0F172A",
  fontWeight: 600,
};

const manufacturerDropdown = {
  position: "absolute",
  top: 44,
  left: 0,
  width: 360,
  maxHeight: 260,
  overflowY: "auto",
  background: "#fff",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
  zIndex: 20,
};

const manufacturerItem = {
  padding: "6px 10px",
  fontSize: 13,
  cursor: "pointer",
};

const linkBtn = {
  background: "none",
  border: "none",
  color: "#2563EB",
  cursor: "pointer",
  fontWeight: 600,
};

const modalBackdrop = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const modalCard = {
  background: "#fff",
  padding: 20,
  borderRadius: 12,
  width: 420,
};
