import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient"; 

export default function DQView() {
  const navigate = useNavigate();
  const { repoId } = useParams();
  const [params] = useSearchParams();
  const sheet = params.get("sheet");

  const [data, setData] = useState(null);
  const [msg, setMsg] = useState("Loading...");

  /* ================= LOAD DQ VIEW ================= */
  useEffect(() => {
    if (!sheet || !repoId) {
      setMsg("Invalid request");
      return;
    }

    setMsg("Loading...");

    api
      .get("/admin/dq/view", {
        params: {
          sheet,
          repoId,
        },
      })
      .then((res) => {
        if (res.data.ok) {
          setData(res.data.data);
          setMsg("");
        } else {
          setMsg(res.data.error || "Failed to load data");
        }
      })
      .catch(() => {
        setMsg("Server error");
      });
  }, [sheet, repoId]);

  return (
    <AdminLayout>
      <h1>DQ Completed Work — Repo {repoId}</h1>

      <button onClick={() => navigate(-1)} style={{ marginBottom: 15 }}>
        ← Back
      </button>

      {msg && <p>{msg}</p>}

      {data && (
        <>
          {/* ================= COMMON FIELDS ================= */}
          <h3>Common Fields</h3>
          <KeyValueTable data={data.common || {}} />

          {/* ================= USER COMPLETED DATA ================= */}
          <h3 style={{ marginTop: 25 }}>User Completed Data</h3>
          <KeyValueTable
            data={{
              "Completed By": data.userWork?.completedBy,
              "Date Verified": data.userWork?.dateVerified,
              "Issue Identified": data.userWork?.issueIdentified,
              Remarks: data.userWork?.remarks,
            }}
          />
        </>
      )}
    </AdminLayout>
  );
}

/* ================= REUSABLE TABLE ================= */

function KeyValueTable({ data }) {
  return (
    <table
      width="100%"
      cellPadding="8"
      style={{
        borderCollapse: "collapse",
        background: "#fff",
        marginBottom: 20,
      }}
    >
      <thead>
        <tr style={{ background: "#f1f5f9" }}>
          <th style={th}>Field</th>
          <th style={th}>Value</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([key, value]) => (
          <tr key={key}>
            <td style={tdLabel}>{key}</td>
            <td style={tdValue}>{value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ================= STYLES ================= */

const th = {
  border: "1px solid #e5e7eb",
  textAlign: "left",
};

const tdLabel = {
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  width: "30%",
  background: "#f8fafc",
};

const tdValue = {
  border: "1px solid #e5e7eb",
};
