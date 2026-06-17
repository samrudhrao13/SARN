import React, { useState } from "react";
import api from "../../../config/apiClient";

const TRANSCRIPTION_COMMENTS = [
  "No general SDS",
  "Discontinued",
  "Discontinued with an updated SDS",
  "Exempted",
  "Article",
  "Obsolete",
  "No update in revision Date",
  "Verified transcription",
  "Assign SDS",
  "Not able to view old repository number",
  "Not able to view new repository number",
  "Non-English SDS",
  "PDF not attached in the repository",
  "Not an SDS",
  "Incomplete SDS",
  "Test file",
  "Processed as problem identified SDS",
];

const TRANSCRIPTION_COMMENTS_EXPLANATION = [
  "As per SOP we do not consider Percent Volatile, hence not made any changes",
  "Limited Characters not fitting in the text box",
  "As per SOP we do not consider Percent Volatile, hence not made any changes and Limited Characters not fitting in the text box",
  "Completed",
];


export default function TranscriptionForm({
  sheet,
  refId,
  userId,
  onDone,
}) {
  const [customComment, setCustomComment] = useState("");
  const [form, setForm] = useState({
    verifiedDate: "",
    comments1: "",
    comments2: "",
    remarks: "",
    remarks1: "",
    remarks2: "",
  });

  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!sheet || !refId || !userId) {
      alert("Workflow context missing. Please reload.");
      return;
    }

    try {
      setLoading(true);

      const fd = new FormData();
      fd.append("sheet", sheet);
      fd.append("refId", refId);
      fd.append("userId", userId);

      fd.append("verifiedDate", form.verifiedDate);
      fd.append(
        "comments1",
        form.comments1 === "OTHER" ? customComment : form.comments1
      );
      fd.append("comments2", form.comments2);
      fd.append("remarks", form.remarks);
      fd.append("remarks1", form.remarks1);
      fd.append("remarks2", form.remarks2);

      const res = await api.post(
        "/sds/workflow/transcription",
        fd
      );

      if (!res.data.ok) {
        alert(res.data.error || "Submit failed");
        return;
      }

      alert("✅ Transcription completed. Sent to billing.");
      onDone && onDone();

    } catch (err) {
      console.error("TRANSCRIPTION ERROR:", err);
      alert("❌ Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3>Transcription Stage</h3>

      <Field label="Verified Date">
        <input
          type="date"
          value={form.verifiedDate}
          onChange={e => update("verifiedDate", e.target.value)}
          required
        />
      </Field>

      {/* ===== DROPDOWN COMMENTS ===== */}
      <Field label="Comments for Transcription">
        <select
          value={form.comments1}
          onChange={e => update("comments1", e.target.value)}
        >
          <option value=""></option>
          {TRANSCRIPTION_COMMENTS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          <option value="OTHER">Other</option> {/* ✅ NEW */}
        </select>
                {form.comments1 === "OTHER" && (
          <input
            type="text"
            placeholder="Enter custom comment"
            value={customComment}
            onChange={e => setCustomComment(e.target.value)}
          />
        )}
      </Field>

      <Field label="Comments for Transcription 1">
        <select
          value={form.comments2}
          onChange={e => update("comments2", e.target.value)}
        >
          <option value="">Select explanation (optional)</option>
          {TRANSCRIPTION_COMMENTS_EXPLANATION.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </Field>

      <Field label="Remarks">
        <textarea
          value={form.remarks}
          onChange={e => update("remarks", e.target.value)}
        />
      </Field>
      <Field label="Remarks 1">
  <textarea
    value={form.remarks1}
    onChange={e => update("remarks1", e.target.value)}
  />
</Field>

<Field label="Remarks 2">
  <textarea
    value={form.remarks2}
    onChange={e => update("remarks2", e.target.value)}
  />
</Field>

      <button disabled={loading}>
        {loading ? "Submitting..." : "Submit Transcription"}
      </button>
    </form>
  );
}

/* ================= FIELD ================= */

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
