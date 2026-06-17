// ===============================
// src/api/User.js — FIXED VERSION
// ===============================

import api from "../config/apiClient";

export async function fetchUsers() {
  try {
    const res = await api.get("/users");
    return res.data;
  } catch (err) {
    console.error("fetchUsers error:", err);
    return { ok: false, error: "Failed to fetch users" };
  }
}
