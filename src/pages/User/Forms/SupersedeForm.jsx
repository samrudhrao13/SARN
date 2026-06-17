import React, { useState } from "react";
import api from "../../../config/apiClient";

export default function SupersedeForm({ sheet, refId, userId, onDone }) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!sheet || !refId || !userId) {
      alert("Workflow context missing. Please reload.");
      return;
    }

    const fd = new FormData(e.target);

    fd.append("sheet", sheet);
    fd.append("refId", refId);
    fd.append("userId", userId);

    try {
      setLoading(true);

      const res = await api.post("/sds/workflow/supersede", fd);

      if (!res.data.ok) {
        alert(res.data.error || "Submit failed");
        return;
      }

      alert("✅ Supersede completed. Waiting for admin assignment.");
      onDone && onDone();
    } catch (err) {
      console.error("SUPERSEDE ERROR:", err);
      alert("❌ Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h3>Supersede Stage</h3>

      <label>New Repository Number *</label>
      <input name="newRepositoryNumber" required />

      <label>Supersede Date *</label>
      <input type="date" name="supersedeDate" required />

      <label>Verified Date *</label>
      <input type="date" name="verifiedDate" required />

      <label>Comments *</label>
      <textarea name="comments1"  />

      <label>Comments 2</label>
      <textarea name="comments2" />
      
      <label>Remarks *</label>
      <textarea name="remarks" />

      <label>Remarks 1</label>
      <textarea name="remarks1" />

      <label>Remarks 2</label>
      <textarea name="remarks2" />

     

      {/* ✅ PDF UPLOAD */}
      <label>Upload PDF(Optional)</label>
      <input type="file" name="pdf" accept="application/pdf" />

      <button disabled={loading}>
        {loading ? "Submitting..." : "Submit Supersede"}
      </button>
    </form>
  );
}
