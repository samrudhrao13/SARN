import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserLayout from "../../layouts/UserLayout";
import api from "../../config/apiClient";

/* REAL FORMS */
import SearchForm from "./Forms/SearchForm";
import SupersedeForm from "./Forms/SupersedeForm";
import TranscriptionForm from "./Forms/TranscriptionForm";

/* ================= HELPERS ================= */

const safeVal = (v) => {
  if (v === null || v === undefined) return "-";
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

const canWork = (workflow, stage, userId) => {
  const s = workflow?.[stage];
  return (
    workflow?.currentStage === stage &&
    workflow?.workflowStatus !== "ASSIGN_PENDING" &&
    s?.assignedTo === userId &&
    s?.status !== "completed"
  );
};

/* ================= COMPONENT ================= */

export default function WorkflowUserView() {
  const { sheet, referenceId } = useParams();
  const navigate = useNavigate();

  const stored = localStorage.getItem("sarnUser");
  const user = stored ? JSON.parse(stored) : null;
  const userId = user?.userId;

  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ---------- SESSION GUARD ---------- */
  if (!userId) {
    return (
      <UserLayout>
        <p style={{ color: "red" }}>Session expired. Please login again.</p>
      </UserLayout>
    );
  }

  /* ---------- FETCH (ADMIN PARITY) ---------- */
  const loadWorkflow = useCallback(() => {
    setLoading(true);

    api
      .get("/workflow/details", {
        params: {
          sheet,
          refId: referenceId,
        },
      })
      .then((res) => {
        if (res.data.ok) setWorkflow(res.data.workflow);
        else setWorkflow(null);
      })
      .catch(() => setWorkflow(null))
      .finally(() => setLoading(false));
  }, [sheet, referenceId]);

  useEffect(() => {
    loadWorkflow();
  }, [loadWorkflow]);

  if (loading) {
    return <UserLayout>Loading…</UserLayout>;
  }

  if (!workflow) {
    return (
      <UserLayout>
        <h2>Reference not found</h2>
        <button onClick={() => navigate("/user/assigned-sds")}>
          Back to Assigned Work
        </button>
      </UserLayout>
    );
  }

  const stage = workflow.currentStage || "search";

  return (
    <UserLayout>
      <button
        onClick={() => navigate("/user/assigned-sds")}
        style={{ marginBottom: 20 }}
      >
        ← Back
      </button>

      <h1>SDS Workflow</h1>
      <StageBadge stage={stage} />

      {/* COMMON */}
      <Block title="Common Fields">
        <Table data={workflow.common} />
      </Block>

      {/* SEARCH */}
      {stage === "search" &&
        (canWork(workflow, "search", userId) ? (
          <SearchForm
            sheet={sheet}
            refId={referenceId}
            userId={userId}
            searchData={workflow.search || {}}
            onDone={loadWorkflow}
          />
        ) : (
          <Waiting stage="Search" />
        ))}

      {/* SUPERSEDE */}
      {stage === "supersede" && (
        <>
          <ReadOnly title="Search (Read Only)" data={workflow.search} />
          {canWork(workflow, "supersede", userId) ? (
            <SupersedeForm
              sheet={sheet}
              refId={referenceId}
              userId={userId}
              onDone={loadWorkflow}
            />
          ) : (
            <Waiting stage="Supersede" />
          )}
        </>
      )}

      {/* TRANSCRIPTION */}
      {stage === "transcription" && (
        <>
          <ReadOnly title="Search (Read Only)" data={workflow.search} />
          <ReadOnly title="Supersede (Read Only)" data={workflow.supersede} />
          {canWork(workflow, "transcription", userId) ? (
            <TranscriptionForm
              sheet={sheet}
              refId={referenceId}
              userId={userId}
              onDone={loadWorkflow}
            />
          ) : (
            <Waiting stage="Transcription" />
          )}
        </>
      )}

      {/* BILLING */}
      {stage === "billing" && (
        <Block title="Billing">
          <p style={{ color: "#16a34a", fontWeight: 700 }}>
            ✔ Sent to billing (Admin only)
          </p>
        </Block>
      )}
    </UserLayout>
  );
}

/* ================= UI ================= */

const Waiting = ({ stage }) => (
  <Block title={stage}>
    <p style={{ color: "#b45309", fontWeight: 600 }}>
      ⏳ Waiting for admin assignment
    </p>
  </Block>
);

const Block = ({ title, children }) => (
  <div
    style={{
      background: "#fff",
      padding: 24,
      borderRadius: 12,
      marginBottom: 24,
    }}
  >
    <h3>{title}</h3>
    {children}
  </div>
);

/* ================= READ ONLY ================= */

const ReadOnly = ({ title, data }) => (
  <Block title={title}>
    <Table data={data} />

    {(data?.pdfUrl || data?.pdf) && (
      <div style={{ marginTop: 12 }}>
        <a
          href={data.pdfUrl || data.pdf}
          target="_blank"
          rel="noopener noreferrer"
          style={downloadBtn}
        >
          ⬇ Download PDF
        </a>
      </div>
    )}
  </Block>
);

/* ================= TABLE ================= */

const Table = ({ data }) => {
  if (!data || typeof data !== "object") return <p>-</p>;

  return (
    <table style={tableStyle}>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <td style={keyCell}>{k}</td>
            <td style={valueCell}>{safeVal(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const StageBadge = ({ stage }) => (
  <span
    style={{
      background: "#2563eb",
      color: "#fff",
      padding: "6px 16px",
      borderRadius: 20,
      display: "inline-block",
      marginBottom: 16,
    }}
  >
    {stage.toUpperCase()}
  </span>
);

/* ================= STYLES ================= */

const tableStyle = { width: "100%", borderCollapse: "collapse" };

const keyCell = {
  border: "1px solid #ddd",
  padding: 8,
  fontWeight: 600,
  width: "35%",
  background: "#f8fafc",
};

const valueCell = { border: "1px solid #ddd", padding: 8 };

const downloadBtn = {
  display: "inline-block",
  padding: "6px 12px",
  background: "#1d4ed8",
  color: "#fff",
  borderRadius: 6,
  fontWeight: 600,
  textDecoration: "none",
};
