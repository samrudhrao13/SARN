// =====================================================
//  src/api/Workflow.js — FIXED (uses apiClient)
// =====================================================

import api from "../config/apiClient";

// -----------------------------------------------------
// FETCH WORKFLOW LIST
// -----------------------------------------------------
export async function fetchWorkflowList(company, sheet) {
  try {
    const res = await api.get("/workflow", {
      params: { company, sheet },
    });
    return res.data;
  } catch (err) {
    console.error("fetchWorkflowList error:", err);
    return { ok: false, error: "Failed to fetch workflow list" };
  }
}

// -----------------------------------------------------
// FETCH SINGLE REFERENCE
// -----------------------------------------------------
export async function fetchReferenceById(company, sheet, refId) {
  try {
    const res = await api.get(
      `/references/${company}/${sheet}/${refId}`
    );
    return res.data;
  } catch (err) {
    console.error("fetchReferenceById error:", err);
    return { ok: false, error: "Failed to fetch reference" };
  }
}

// -----------------------------------------------------
// SEARCH UPDATE
// -----------------------------------------------------
export async function updateSearch(formData) {
  try {
    const res = await api.post("/workflow/search", formData);
    return res.data;
  } catch (err) {
    console.error("updateSearch error:", err);
    return { ok: false, error: "Search update failed" };
  }
}

// -----------------------------------------------------
// SUPERSEDE UPDATE
// -----------------------------------------------------
export async function updateSupersede(data) {
  try {
    const res = await api.post("/workflow/supersede", data);
    return res.data;
  } catch (err) {
    console.error("updateSupersede error:", err);
    return { ok: false, error: "Supersede update failed" };
  }
}

// -----------------------------------------------------
// TRANSCRIPTION UPDATE
// -----------------------------------------------------
export async function updateTranscription(data) {
  try {
    const res = await api.post("/workflow/transcription", data);
    return res.data;
  } catch (err) {
    console.error("updateTranscription error:", err);
    return { ok: false, error: "Transcription update failed" };
  }
}

// -----------------------------------------------------
// BILLING UPDATE
// -----------------------------------------------------
export async function updateBilling(data) {
  try {
    const res = await api.post("/workflow/billing", data);
    return res.data;
  } catch (err) {
    console.error("updateBilling error:", err);
    return { ok: false, error: "Billing update failed" };
  }
}

// -----------------------------------------------------
// REMOVE ASSIGNMENT
// -----------------------------------------------------
export async function removeAssignment(refId) {
  try {
    const res = await api.delete(`/assign/${refId}`);
    return res.data;
  } catch (err) {
    console.error("removeAssignment error:", err);
    return { ok: false, error: "Failed to remove assignment" };
  }
}
