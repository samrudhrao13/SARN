import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

export default function BatchAssign() {
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");

  const [users, setUsers] = useState([]);
  const [assignUser, setAssignUser] = useState("");

  const [records, setRecords] = useState([]);
const [selected, setSelected] = useState([]);

const [manufacturer, setManufacturer] =
  useState("");
const [duplicateFilter, setDuplicateFilter] =
  useState("all");
  const [language, setLanguage] =
  useState("");

const [page, setPage] =
  useState(1);

const PAGE_SIZE = 100;

const [loading, setLoading] = useState(false);
const [msg, setMsg] = useState("");

  /* ================= LOAD USERS ================= */

  useEffect(() => {
    loadUsers();
    loadSheets();
  }, []);

  async function loadUsers() {
    try {
      const res = await api.get("/users");

      if (res.data.ok) {
        console.log(res.data.rows);
        setUsers(
          (res.data.users || []).filter(
            u => u.role === "user"
          )
        );
      }
    } catch {}
  }

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");

      if (res.data.ok) {
        setSheets(res.data.sheets || []);
      }
    } catch {}
  }

  /* ================= LOAD RECORDS ================= */

  useEffect(() => {
    if (!sheet) {
      setRecords([]);
      return;
    }

    loadRecords();
  }, [sheet]);

  async function loadRecords() {
  try {
    setLoading(true);

    const res = await api.get(
      "/admin/batch/list",
      {
        params: { sheet }
      }
    );

    if (res.data.ok) {
      console.log(
        "API RESPONSE",
        res.data
      );

      console.log(
        "FIRST ROW",
        res.data.rows?.[0]
      );

      setRecords(
        res.data.rows || []
      );
    }
  } finally {
    setLoading(false);
  }
}

  /* ================= SELECTION ================= */

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  }

  function selectAll() {
  const ids =
    pagedRecords
      .filter(r => !r.assignedTo)
      .map(r => r.recordId);

  setSelected(ids);
}

  function clearSelection() {
    setSelected([]);
  }
  function selectDuplicates() {
  const ids =
    filteredRecords
      .filter(
        r =>
          r.duplicate &&
          !r.assignedTo
      )
      .map(
        r => r.recordId
      );

  setSelected(ids);
}

  /* ================= ASSIGN ================= */

  async function assignSelected() {
    if (!sheet) {
      return setMsg("Select Sheet");
    }

    if (!assignUser) {
      return setMsg("Select User");
    }

    if (selected.length === 0) {
      return setMsg("Select Records");
    }

    try {
      setMsg("Assigning...");

      const res = await api.post(
        "/admin/batch/assign",
        {
          sheet,
          recordIds: selected,
          userId: assignUser,
        }
      );

      if (res.data.ok) {
        setMsg(
          `${selected.length} records assigned`
        );

        setSelected([]);

        loadRecords();
      }
    } catch {
      setMsg("Assignment failed");
    }
  }
const manufacturers = [
  ...new Set(
    records
      .map(
        r =>
          r.manufacturerName
      )
      .filter(Boolean)
  ),
].sort();
const languages = [
  ...new Set(
    records
      .map(r => r.language)
      .filter(Boolean)
  ),
].sort();
console.log("LANGUAGES", languages);
let filteredRecords =
  [...records];

if (manufacturer) {
  filteredRecords =
    filteredRecords.filter(
      r =>
        r.manufacturerName ===
        manufacturer
    );
}
if (language) {
  filteredRecords =
    filteredRecords.filter(
      r =>
        r.language ===
        language
    );
}

if (
  duplicateFilter ===
  "duplicates"
) {
  filteredRecords =
    filteredRecords.filter(
      r => r.duplicate
    );
}

if (
  duplicateFilter ===
  "normal"
) {
  filteredRecords =
    filteredRecords.filter(
      r => !r.duplicate
    );
}

const totalPages =
  Math.ceil(
    filteredRecords.length /
      PAGE_SIZE
  ) || 1;

const pagedRecords =
  filteredRecords.slice(
    (page - 1) *
      PAGE_SIZE,
    page * PAGE_SIZE
  );
  return (
    <div
  style={{
    marginLeft: "160px",
    padding: "20px",
    width: "calc(100% - 220px)",
    boxSizing: "border-box",
  }}
>
      <h2>Batch Assignment</h2>

      {/* ================= FILTERS ================= */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <select
  value={sheet}
  onChange={e => {
    setSheet(e.target.value);
    setPage(1);
  }}
>
  <option value="">
    Select Sheet
  </option>

  {sheets.map(s => (
    <option key={s} value={s}>
      {s}
    </option>
  ))}
</select>

<select
  value={assignUser}
  onChange={e =>
    setAssignUser(e.target.value)
  }
>
  <option value="">
    Assign To
  </option>

  {users.map(u => (
    <option
      key={u.userId}
      value={u.userId}
    >
      {u.userId}
    </option>
  ))}
</select>
        <select
  value={manufacturer}
  onChange={e => {
    setManufacturer(e.target.value);
    setPage(1);
  }}
>
  <option value="">
    All Manufacturers
  </option>

  {manufacturers.map(m => (
    <option key={m} value={m}>
      {m}
    </option>
  ))}
</select>

<select
  value={language}
  onChange={e => {
    setLanguage(e.target.value);
    setPage(1);
  }}
>
  <option value="">
    All Languages
  </option>

  {languages.map(l => (
    <option key={l} value={l}>
      {l}
    </option>
  ))}
</select>

<select
  value={duplicateFilter}
  onChange={e => {
    setDuplicateFilter(e.target.value);
    setPage(1);
  }}
>
  <option value="all">
    All Records
  </option>

  <option value="duplicates">
    Duplicates Only
  </option>

  <option value="normal">
    Non-Duplicates
  </option>
</select>

        <button onClick={selectAll}>
          Select All
        </button>
        <button
  onClick={
    selectDuplicates
  }
>
  Select Duplicates
</button>

        <button onClick={clearSelection}>
          Clear
        </button>

        <button
          onClick={assignSelected}
        >
          Assign Selected
        </button>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 10,
            color: "#2563eb",
          }}
        >
          {msg}
        </div>
      )}

      {/* ================= TABLE ================= */}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table
          border="1"
          width="100%"
          cellPadding="8"
        >
          <thead>
            <tr
              style={{
                background: "#f1f5f9",
              }}
            >
              <th>Select</th>
              <th>New Repository</th>
              <th>Duplicate</th>
              <th>Chemical Name</th>
              <th>Manufacturer</th>
              <th>Language</th>
              <th>Site Name</th>
              <th>Revision Date</th>
              <th>Status</th>
              <th>Assigned To</th>
            </tr>
          </thead>

          <tbody>
            {pagedRecords.map(r => (
              <tr
  key={r.recordId}
  style={{
    background:
      r.duplicate
        ? "#fee2e2"
        : "white",
  }}
>
                <td>
                  {!r.assignedTo && (
                    <input
                      type="checkbox"
                      checked={selected.includes(
                        r.recordId
                      )}
                      onChange={() =>
                        toggle(r.recordId)
                      }
                    />
                  )}
                </td>

                <td>{r.newRepository || r.common?.newRepository || "-"}</td>
                <td>
  {r.duplicate ? (
    <span
      style={{
        background:
          "#dc2626",
        color: "#fff",
        padding:
          "3px 8px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      DUPLICATE
    </span>
  ) : (
    "-"
  )}
</td>

                <td>
                  {r.chemicalName}
                </td>

                <td>
                  {r.manufacturerName}
                </td>
                <td>
                {r.language || "-"}
                </td>
                <td>{r.siteName}</td>

                <td>
                  {r.revisionDate}
                </td>

                <td>{r.status}</td>

                <td>
                  {r.assignedTo || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
      )}
      <div
  style={{
    marginTop: 20,
    display: "flex",
    gap: 10,
    alignItems: "center",
  }}
>
  <button
    disabled={page === 1}
    onClick={() =>
      setPage(page - 1)
    }
  >
    Previous
  </button>

  <span>
    Page {page} of {totalPages}
  </span>

  <button
    disabled={
      page === totalPages
    }
    onClick={() =>
      setPage(page + 1)
    }
  >
    Next
  </button>
</div>
    </div>
  );
}