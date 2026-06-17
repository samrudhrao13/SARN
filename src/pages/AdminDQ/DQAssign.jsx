import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;
const FORCE_FLAG = "__FORCE_BILLED__";

export default function DQAssign() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [users, setUsers] = useState([]);
  const [assignUser, setAssignUser] = useState("");

  const [repos, setRepos] = useState([]);
  const [selected, setSelected] = useState([]);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState("");

  const [reassignRepo, setReassignRepo] = useState(null);
  const [reassignUser, setReassignUser] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  /* LOAD USERS */
  useEffect(() => {
    api.get("/users").then(res => {
      if (res.data.ok) {
        setUsers(res.data.users.filter(u => u.role === "user"));
      }
    });
  }, []);

  /* LOAD SHEETS */
  useEffect(() => {
    api.get("/dq/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* LOAD LIST */
  useEffect(() => {
    if (!sheet) return;

    setMsg("Loading...");
    setSelected([]);

    api.get("/dq/list", {
      params: { sheet, page, pageSize: PAGE_SIZE },
    }).then(res => {
      if (res.data.ok) {
        setRepos(res.data.rows || []);
        setTotal(res.data.total || 0);
        setMsg("");
      } else {
        setRepos([]);
        setMsg("❌ Failed to load");
      }
    });
  }, [sheet, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggle = repoId => {
    setSelected(p =>
      p.includes(repoId)
        ? p.filter(x => x !== repoId)
        : [...p, repoId]
    );
  };

  const selectAllUnassigned = () => {
    setSelected(repos.filter(r => !r.locked).map(r => r.repoId));
  };

  /* ASSIGN */
  const assign = async () => {
    if (!assignUser || selected.length === 0) {
      setMsg("Select user & repos");
      return;
    }

    for (const repoId of selected) {
      await api.post("/dq/assign", {
        sheet,
        repoId,
        userId: assignUser,
      });
    }

    setSelected([]);
    setMsg("✅ Assignment completed");
  };

  /* CONFIRM REASSIGN */
  const confirmReassign = async () => {
    await api.post("/dq/reassign", {
      sheet,
      repoId: reassignRepo.repoId,
      newUserId: reassignUser,
      reason: reassignReason,
    });

    setReassignRepo(null);
    setReassignUser("");
    setReassignReason("");
    setMsg("✅ Reassigned successfully");
  };

  return (
    <AdminLayout>
      <h1>📋 Assign DQ Work</h1>

      <div style={row}>
        <select value={sheet} onChange={e => setSheet(e.target.value)} style={selectStyle}>
          <option value="">Select Sheet</option>
          {sheets.map(s => <option key={s}>{s}</option>)}
        </select>

        <select value={assignUser} onChange={e => setAssignUser(e.target.value)} style={selectStyle}>
          <option value="">Assign To</option>
          {users.map(u => (
            <option key={u.userId} value={u.userId}>{u.userId}</option>
          ))}
        </select>
      </div>

      <div style={{ ...row, marginTop: 12 }}>
        <button style={secondaryBtn} onClick={selectAllUnassigned}>
          Select All Unassigned
        </button>
        <button style={primaryBtn} onClick={assign}>
          Assign Selected ({selected.length})
        </button>
      </div>

      {msg && <p>{msg}</p>}

      <table border="1" width="100%" cellPadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>Select / Action</th>
            <th>Repo ID</th>
            <th>Stage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {repos.map((r, i) => {
            const isForce = r.assignedTo === FORCE_FLAG;

            return (
              <tr key={r.repoId}>
                <td>{(page - 1) * PAGE_SIZE + i + 1}</td>

                <td>
                  {!r.locked ? (
                    <input
                      type="checkbox"
                      checked={selected.includes(r.repoId)}
                      onChange={() => toggle(r.repoId)}
                    />
                  ) : !isForce ? (
                    <button style={linkBtn} onClick={() => setReassignRepo(r)}>
                      Reassign
                    </button>
                  ) : (
                    "🔒"
                  )}
                </td>

                <td>{r.repoId}</td>
                <td>{r.stage}</td>

                <td>
                  {isForce ? (
                    <span style={dangerBadge}>Force Billed</span>
                  ) : r.locked ? (
                    <span style={successBadge}>Assigned to {r.assignedTo}</span>
                  ) : (
                    <span style={dangerBadge}>Unassigned</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ================= PAGINATION (VISIBLE) ================= */}
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button
          style={{ ...secondaryBtn, ...(page === 1 ? disabledBtn : {}) }}
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          ⬅ Prev
        </button>

        <span style={{ fontWeight: 700 }}>
          Page {page} / {totalPages}
        </span>

        <button
          style={{ ...secondaryBtn, ...(page === totalPages ? disabledBtn : {}) }}
          disabled={page === totalPages}
          onClick={() => setPage(p => p + 1)}
        >
          Next ➡
        </button>
      </div>

      {/* REASSIGN MODAL */}
      {reassignRepo && (
        <div style={modalBackdrop}>
          <div style={modalCard}>
            <h3>Reassign Repo</h3>

            <p>
              Repo: <b>{reassignRepo.repoId}</b><br />
              Assigned To: <b>{reassignRepo.assignedTo}</b>
            </p>

            <select
              value={reassignUser}
              onChange={e => setReassignUser(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select User</option>
              {users.map(u => (
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
              <button style={primaryBtn} onClick={confirmReassign}>
                Confirm
              </button>
              <button style={{ ...secondaryBtn, marginLeft: 8 }} onClick={() => setReassignRepo(null)}>
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

const row = { display: "flex", gap: 12 };

const selectStyle = {
  minWidth: "220px",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #CBD5E1",
};

const primaryBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  background: "#2563EB",
  color: "#FFFFFF",
  border: "none",
  fontWeight: 600,
};

const secondaryBtn = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "1px solid #64748B",
  background: "#E2E8F0",
  color: "#0F172A",
  fontWeight: 600,
};

const disabledBtn = {
  background: "#E5E7EB",
  color: "#6B7280",
  cursor: "not-allowed",
};

const linkBtn = {
  background: "none",
  border: "none",
  color: "#2563EB",
  fontWeight: 600,
  cursor: "pointer",
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

const dangerBadge = {
  background: "#FEE2E2",
  color: "#991B1B",
  padding: "4px 8px",
  borderRadius: 6,
  fontWeight: 600,
};

const successBadge = {
  background: "#DCFCE7",
  color: "#166534",
  padding: "4px 8px",
  borderRadius: 6,
  fontWeight: 600,
};
