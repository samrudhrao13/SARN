import React, {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useNavigate,
} from "react-router-dom";

import api from "../../config/apiClient";
const issueOptions = [
  "Change in Product Name",
  "Change in Product Code",
  "Change in Country",
  "Archived through URL method",
  "Not able to view",
  "Non-English SDS",
  "Worked through URL method",
  "Not an SDS (Article)",
  "Discontinued",
  "Dashboard chemical name and repository chemical name not matching",
  "Change in manufacturer name",
  "Duplicate in other site",
  "Wrong PDF attached",
  "Searched and attached",
  "Not processed since there is no confirmation from manufacturer",
  "PDF Not attached in the Repository",
  "Not an SDS (TDS/PDS)",
  "Incomplete SDS",
  "Manufacturer details not available",
  "English SDS",
  "Noneditable Records",
  "Processed as Problem Identified",
  "Transcribed as per SDS attached",
  "No Repository Number",
  "Unique Number",
  "Already Worked",
  "Archived SDS is an English SDS, but active SDS is a non-English SDS",
];

const remarks1Options = [
  "As per SOP we do not consider Percent Volatile, hence not made any changes",
  "Limited Characters not fitting in the text box",
  "As per SOP we do not consider Percent Volatile, hence not made any changes and Limited Characters not fitting in the text box",
];
export default function BatchWorkflow() {
  const { sheet, recordId } =
    useParams();

  const navigate = useNavigate();

  const user =
    JSON.parse(
      localStorage.getItem("sarnUser")
    ) || {};

  const [loading, setLoading] =
    useState(true);

  const [workflow, setWorkflow] =
    useState(null);

  const [form, setForm] = useState({
    dateVerified: "",

    issueIdentified: "",

    remarks1: "",

    remarks2: "",

    status: "Completed",
  });

  useEffect(() => {
    loadRecord();
  }, []);

  async function loadRecord() {
    try {
      const res = await api.get(
        "/batch/details",
        {
          params: {
            sheet,
            recordId,
          },
        }
      );

      if (res.data.ok) {
        setWorkflow(
          res.data.workflow
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function submit() {
    try {
      if (
        !form.dateVerified
      ) {
        return alert(
          "Date Verified Required"
        );
      }

      const res = await api.post(
        "/batch/workflow/verification",
        {
          sheet,

          recordId,

          userId:
            user.userId,

          dateVerified:
            form.dateVerified,

          issueIdentified:
            form.issueIdentified,

          remarks1:
            form.remarks1,

          remarks2:
            form.remarks2,

          status:
            form.status,
        }
      );

      if (res.data.ok) {
        alert(
          "Verification Submitted"
        );

        navigate(
          "/user/batch/tasks"
        );
      }
    } catch (err) {
      console.error(err);

      alert(
        "Submission Failed"
      );
    }
  }

  if (loading) {
  return (
    <div
      style={{
        marginLeft: "160px",
        padding: "20px",
        width: "calc(100% - 220px)",
        boxSizing: "border-box",
      }}
    >
      Loading...
    </div>
  );
}

  if (!workflow) {
  return (
    <div
      style={{
        marginLeft: "160px",
        padding: "20px",
        width: "calc(100% - 220px)",
        boxSizing: "border-box",
      }}
    >
      Record Not Found
    </div>
  );
}

  const c =
    workflow.common || {};

 return (
  <div
    style={{
      marginLeft: "160px",
      padding: "20px",
      width: "calc(100% - 220px)",
      boxSizing: "border-box",
      minHeight: "100vh",
    }}
  >
      <h2>
        Batch Verification
      </h2>

      {/* ================= RECORD DETAILS ================= */}

      <div style={card}>
        <h3>
          Record Details
        </h3>

        <InfoRow
          label="Chemical Name"
          value={
            c.chemicalName
          }
        />

        <InfoRow
          label="Manufacturer"
          value={
            c.manufacturerName
          }
        />

        <InfoRow
          label="Revision Date"
          value={
            c.revisionDate
          }
        />

        <InfoRow
          label="Site Name"
          value={c.siteName}
        />

        <InfoRow
          label="Site SDS #"
          value={
            c.siteSdsNumber
          }
        />

        <InfoRow
          label="Language"
          value={c.language}
        />

        <InfoRow
          label="Repository"
          value={
            c.newRepository
          }
        />

        <InfoRow
          label="Product Code"
          value={
            c.productCode
          }
        />

        <InfoRow
          label="PDF File"
          value={
            c.pdfFileName
          }
        />
      </div>

      {/* ================= VERIFICATION ================= */}

      <div
        style={{
          ...card,
          marginTop: 20,
        }}
      >
        <h3>
          Verification Form
        </h3>
<div style={field}>
  <label>
    Date Verified
  </label>

  <input
    type="date"
    value={
      form.dateVerified
    }
    onChange={e =>
      setForm({
        ...form,
        dateVerified:
          e.target.value,
      })
    }
  />
</div>
       <div style={field}>
  <label>
    Issue Identified
  </label>

  <select
    value={form.issueIdentified}
    onChange={e =>
      setForm({
        ...form,
        issueIdentified:
          e.target.value,
      })
    }
  >
    <option value="">
      Select Issue
    </option>

    {issueOptions.map(issue => (
      <option
        key={issue}
        value={issue}
      >
        {issue}
      </option>
    ))}
  </select>
</div>

        <div style={field}>
  <label>
    Remarks 1
  </label>

  <select
    value={form.remarks1}
    onChange={e =>
      setForm({
        ...form,
        remarks1: e.target.value,
      })
    }
  >
    <option value="">
      Select Remark
    </option>

    {remarks1Options.map(remark => (
      <option
        key={remark}
        value={remark}
      >
        {remark}
      </option>
    ))}
  </select>
</div>

        <div style={field}>
          <label>
            Remarks 2
          </label>

          <textarea
            rows={3}
            value={
              form.remarks2
            }
            onChange={e =>
              setForm({
                ...form,
                remarks2:
                  e.target.value,
              })
            }
          />
        </div>

        <div style={field}>
          <label>
            Status
          </label>

          <select
            value={
              form.status
            }
            onChange={e =>
              setForm({
                ...form,
                status:
                  e.target.value,
              })
            }
          >
            <option>
              Completed
            </option>

            <option>
              Not Completed
            </option>
          </select>
        </div>

        <button
          onClick={submit}
          style={{
            marginTop: 20,
            padding:
              "10px 20px",
            background:
              "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor:
              "pointer",
          }}
        >
          Submit Verification
        </button>
      </div>
    </div>
  );
}

/* ================= HELPERS ================= */

function InfoRow({
  label,
  value,
}) {
  return (
    <div
      style={{
        display: "flex",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 180,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div>
        {value || "-"}
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  width: "100%",
  boxSizing: "border-box",
};

const field = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginBottom: 16,
};