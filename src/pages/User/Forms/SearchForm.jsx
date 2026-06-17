import React, { useState } from "react";
import "./Form.css";
import api from "../../../config/apiClient";

const SEARCH_COMMENTS = [
  "SDS through websearch",
  "Sent form request",
  "Sent mail request",
];

const SEARCH_COMMENTS_1 = [
  "Received SDS through mail request/weblink",
  "No revision in existing SDS",
];

const SEARCH_COMMENTS_2 = [
  "Yes",
  "No",
  "No update in revision date",
  "Discontinued",
  "Discontinued with an updated SDS",
  "Obsolete",
  "Exempted",
  "Article",
  "No general SDS (Discontinued)",
  "On hold after QC",
  "Error in link",
  "No contact details to send mail",
  "Need authorization or Customer's name",
  "Mismatch in SDS",
  "Non-English SDS",
  "PDF not available",
  "Not an SDS",
  "No matching records found",
  "Incomplete PDF",
  "Test file",
  "Archived",
];

export default function SearchForm({
  sheet,
  refId,
  userId,
  searchData,
  onDone
}) {
  const [loading, setLoading] = useState(false);
  const [notPublishable, setNotPublishable] = useState(false);

  // ✅ NEW STATES
  const [status, setStatus] = useState(
  searchData?.status || ""
);
  const [statusUpdated, setStatusUpdated] = useState(false);
  const handleStatusUpdate = async (e) => {
  e?.preventDefault();   

  console.log("🔥 BUTTON CLICKED"); 

  if (!status) {
    alert("Please select status");
    return;
  }

  try {
    const form = document.querySelector(".form-card");

const fd = new FormData(form);

const payload = {
  sheet,
  refId,
  userId,
  status,

  searchType: fd.get("searchType"),
  comments1: fd.get("comments1"),
  comments2: fd.get("comments2"),

  websearch1: fd.get("websearch1"),
  websearch2: fd.get("websearch2"),
  websearch3: fd.get("websearch3"),

  mailId: fd.get("mailId"),

  remarks: fd.get("remarks"),

  supersedeObservation:
    fd.get("supersedeObservation"),

  startDate: fd.get("startDate"),
  endDate: fd.get("endDate"),

  notPublishable,
};

console.log(payload);

const res = await api.post(
  "/sds/workflow/update-status",
  payload
);
    console.log("API RESPONSE:", res.data); // ✅ DEBUG

    if (!res.data.ok) {
      alert("Failed to update status");
      return;
    }

    setStatusUpdated(true);
    alert("✅ Status updated successfully");
  } catch (err) {
    console.error("STATUS UPDATE ERROR:", err);
    alert("❌ Error updating status");
  }
};
  async function handleSubmit(e) {
    e.preventDefault();

    if (!userId) {
      alert("Session expired. Please login again.");
      return;
    }

    const fd = new FormData(e.target);
    fd.append("sheet", sheet);
    fd.append("refId", refId);
    fd.append("userId", userId);
    fd.set("notPublishable", String(notPublishable));

    try {
      setLoading(true);
      const res = await api.post("/sds/workflow/search", fd);

      if (!res.data.ok) {
        alert(res.data.error || "Submit failed");
        return;
      }

      alert("✅ Search submitted successfully");
      onDone && onDone();
    } catch (err) {
      console.error("SEARCH SUBMIT ERROR:", err);
      alert("❌ Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <h3 className="form-title">Search Stage</h3>

      <div className="form-grid">

        {/* ===== DROPDOWNS ===== */}
        <div className="field">
          <label>Search Comments</label>
          <select
            name="searchType"
            defaultValue={searchData?.searchType || ""}
          >
            <option value="" disabled>Select</option>
            {SEARCH_COMMENTS.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Search Comments 1</label>
          <select
            name="comments1"
            defaultValue={searchData?.comments1 || ""}
          >
            <option value="" disabled>Select</option>
            {SEARCH_COMMENTS_1.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>

        <div className="field">
          <label>Search Comments 2</label>
          <select
            name="comments2"
            defaultValue={searchData?.comments2 || ""}
          >
            <option value="" disabled>Select</option>
            {SEARCH_COMMENTS_2.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>

        {/* ===== WEBSEARCH LINKS ===== */}
        <div className="field">
        <label>Websearch Link 1</label>
        <input
          name="websearch1"
          placeholder="Enter URL"
          defaultValue={searchData?.websearch1 || ""}
          />
        </div>

        <div className="field">
          <label>Websearch Link 2</label>
          <input
            name="websearch2"
            placeholder="Enter URL"
            defaultValue={searchData?.websearch2 || ""}
          />
        </div>

        <div className="field">
          <label>Websearch Link 3</label>
          <input
            name="websearch3"
            placeholder="Enter URL"
            defaultValue={searchData?.websearch3 || ""}
          />
        </div>

        {/* ===== MAIL ===== */}
        <div className="field full">
          <label>Mail ID / Source</label>
          <input
            name="mailId"
            placeholder="Enter email or source"
            defaultValue={searchData?.mailId || ""}
          />
        </div>

        {/* ===== TEXT AREAS ===== */}
        <div className="field full">
          <label>Remarks</label>
          <textarea
            name="remarks"
            defaultValue={searchData?.remarks || ""}
          />
        </div>

        <div className="field full">
          <label>Supersede Observation</label>
          <textarea
            name="supersedeObservation"
            defaultValue={searchData?.supersedeObservation || ""}
          />
        </div>

        {/* ===== DATES ===== */}
        <div className="field">
          <label>Start Date</label>
          <input
            type="date"
            name="startDate"
            defaultValue={searchData?.startDate || ""}
          />
        </div>

        <div className="field">
          <label>End Date</label>
          <input
            type="date"
            name="endDate"
            defaultValue={searchData?.endDate || ""}
          />
        </div>

        {/* ===== STATUS BLOCK (NEW) ===== */}
        <div className="field">
          <label>Status</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setStatusUpdated(false);
            }}
          >
            <option value="" disabled>Select Status</option>
            <option value="File available">File available</option>
            <option value="No file Found">No file Found</option>
            <option value="Waiting Response">Waiting Response</option>
          </select>
        </div>

        <div className="field full">
  <button
    type="button"
    className="update-btn"
    disabled={!status}
    onClick={(e) => {
      console.log("🔥 CLICK WORKING");
      handleStatusUpdate(e);
    }}
  >
    Update Status
  </button>
</div>

        {/* ===== NOT PUBLISHABLE ===== */}
        <div className="full not-publishable-block">
          <div className="checkbox-row">
            <input
              type="checkbox"
              id="notPublishable"
              checked={notPublishable}
              onChange={e => setNotPublishable(e.target.checked)}
            />
            <label htmlFor="notPublishable">Not Publishable</label>
          </div>

          <div className="note-text">
            * If marked as Not Publishable, this will skip Supersede and directly proceed to Transcription.
          </div>
        </div>
        {notPublishable && (
  <div className="field full">
    <label>Not Publishable Reason</label>

    <textarea
      name="notPublishableReason"
      placeholder="Enter reason"
      defaultValue={searchData?.notPublishableReason || ""}
      required
    />
  </div>
)}

        {/* ===== FILE ===== */}
        <div className="field full">
          <label>Upload PDF (Optional)</label>
          <input type="file" name="pdf" accept="application/pdf" />
        </div>
      </div>

      {/* ===== SUBMIT ===== */}
      <button
        className="submit-btn"
        disabled={
          loading ||
          !statusUpdated ||
          status === "Waiting Response"
        }
      >
        {loading ? "Submitting..." : "Submit Search"}
      </button>
    </form>
  );
}