// ===============================
// src/api/auth.js — FIXED VERSION
// ===============================

import api from "../config/apiClient";

// ===============================
// LOGIN FUNCTION
// ===============================
export async function login(email, password) {
  try {
    const res = await api.post("/login", {
      email,
      password,
    });
    return res.data;
  } catch (err) {
    console.error("login error:", err);
    return { ok: false, error: "Login failed" };
  }
}

// ===============================
// CREATE USER (SUPER ADMIN)
// ===============================
export async function createUser(email, password, role) {
  try {
    const res = await api.post("/create-user", {
      email,
      password,
      role,
    });
    return res.data;
  } catch (err) {
    console.error("createUser error:", err);
    return { ok: false, error: "Create user failed" };
  }
}
