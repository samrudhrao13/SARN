// =====================================================
//  src/api/Assign.js – FINAL FIXED VERSION
// =====================================================

import api from "../config/apiClient";

// =====================================================
// FETCH ALL REFERENCES FOR A COMPANY + SHEET
// =====================================================
export async function fetchReferences(company, sheet) {
  if (!company || !sheet) {
    return { ok: false, error: "Missing parameters" };
  }

  try {
    const res = await api.get("/references", {
      params: { company, sheet },
    });
    return res.data;
  } catch (err) {
    console.error("fetchReferences error:", err);
    return { ok: false, error: "Network error (fetchReferences)" };
  }
}

// =====================================================
// ASSIGN MULTIPLE REFERENCES TO A USER
// =====================================================
export async function assignMultiple(company, sheet, refIds, userEmail) {
  try {
    const res = await api.post("/assign-multiple", {
      company,
      sheet,
      refIds,
      userEmail,
    });
    return res.data;
  } catch (err) {
    console.error("assignMultiple error:", err);
    return { ok: false, error: "Network error (assignMultiple)" };
  }
}

// =====================================================
// GET TASKS ASSIGNED TO USER
// =====================================================
export async function getUserTasks(email) {
  if (!email) {
    return { ok: false, error: "Email missing" };
  }

  try {
    const res = await api.get("/user-tasks", {
      params: { email },
    });
    return res.data;
  } catch (err) {
    console.error("getUserTasks error:", err);
    return { ok: false, error: "Network error (getUserTasks)" };
  }
}
