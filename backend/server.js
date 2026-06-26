console.log("🔥🔥🔥 SARN SERVER.JS LOADED 🔥🔥🔥", __filename);

require("dotenv").config();

// ================== IMPORTS ==================
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const XLSX = require("xlsx");
const { google } = require("googleapis");

// ================== FIREBASE INIT (PRODUCTION) ==================
const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "sarn-technologies-21d6e", 
  storageBucket: "sarn-technologies-21d6e.appspot.com", 
});

const db = admin.firestore();
const bucket = admin.storage().bucket(
  "sarn-technologies-21d6e.firebasestorage.app"
);
console.log("BUCKET:", bucket.name);


// ================== GOOGLE MEET ==================
async function createGoogleMeetLink(title = "SARN Call", startISO, endISO, description = "") {
  const now = new Date();
  const start = startISO ? new Date(startISO) : now;
  const end   = endISO   ? new Date(endISO)   : new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const calendar = google.calendar({ version: "v3", auth });
  const requestId = `sarn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const event = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    requestBody: {
      summary: title,
      description,
      start: { dateTime: start.toISOString(), timeZone: "Asia/Kolkata" },
      end:   { dateTime: end.toISOString(),   timeZone: "Asia/Kolkata" },
      conferenceData: {
        createRequest: { requestId, conferenceSolutionKey: { type: "hangoutsMeet" } },
      },
    },
  });
  return event.data.hangoutLink
    || event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri
    || null;
}

// ================== EXPRESS ==================
const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const upload = multer({ storage: multer.memoryStorage() });

// ================== TEST FIRESTORE ==================
app.get("/test-firestore", async (req, res) => {
  try {
    await db.collection("ping").add({
      time: Date.now(),
      status: "ok",
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("TEST FIRESTORE ERROR:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});


// ================== HELPERS ==================
// ======================= COMMON HELPERS (REQUIRED) =======================

// Sheet normalizer (DQ + SDS SAFE)
function normalizeSheetName(sheet) {
  return String(sheet || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

// Unified error response (prevents server crash)
function errJson(res, message = "Server error", code = 500) {
  return res.status(code).json({ ok: false, error: message });
}

// Generic normalizer (USED BY WORKFLOW ROUTES)
function normalize(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

// Timestamp helper
function now() {
  return Date.now();
}


// ================== HEALTH ==================
app.get("/", (req, res) => {
  res.send("SARN Backend Running ✅");
});


// ============================================================================
//  AUTH: LOGIN (WITH ATTENDANCE)
// ============================================================================

app.post("/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.json({ ok: false, error: "Missing credentials" });
    }

    // ================= SUPER ADMIN (NO ATTENDANCE) =================
const cleanUserId = String(userId || "").trim();
const cleanPassword = String(password || "").trim();

if (
  cleanUserId === "SARN0001" &&
  cleanPassword === "Sarn@AdminApp"
) {
  return res.json({
    ok: true,
    user: {
      userId: "SARN0001",
      role: "superadmin",
      mustReset: false,
      name: "Super Admin",
    },
  });
}


    // ================= NORMAL USER / ADMIN =================
    const id = userId.trim().toUpperCase();
    const snap = await db.collection("users").doc(id).get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    const user = snap.data();

    if (user.password !== password) {
      return res.json({ ok: false, error: "Invalid password" });
    }

    
    await markLogin({
      userId: user.userId,
      name: user.name || "",
      role: user.role.toLowerCase(), 
    });

    res.json({
      ok: true,
      user: {
        userId: user.userId,
        role: user.role,
        mustReset: user.mustReset || false,
        name: user.name || "",
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ ok: false, error: "Login failed" });
  }
});

// ============================================================================
//  AUTH: CREATE USER (MATCHES FRONTEND EXACTLY)
// ============================================================================
app.post("/auth/create-user", async (req, res) => {
  try {
    const { name, role } = req.body;

    if (!name || !role) {
      return res.json({ ok: false, error: "Missing fields" });
    }

   
    const userId =
      "SARN" +
      Math.floor(1000 + Math.random() * 9000); 

    const tempPassword = "Welcome@123";

    const ref = db.collection("users").doc(userId);
    const snap = await ref.get();

    if (snap.exists) {
      return res.json({ ok: false, error: "Try again (ID collision)" });
    }

    await ref.set({
      userId,
      name,
      role,              
      password: tempPassword,
      mustReset: true,
      createdAt: Date.now(),
    });

    
    res.json({
      ok: true,
      userId,
      tempPassword,
    });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ============================================================================
//  AUTH: RESET PASSWORD
// ============================================================================
app.post("/auth/reset", async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    if (!userId || !newPassword) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    await ref.update({
      password: newPassword,
      mustReset: false,
      updatedAt: Date.now(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    res.status(500).json({ ok: false, error: "Reset failed" });
  }
});
// ============================================================================
//  SUPER ADMIN: FORCE RESET USER PASSWORD (GENERATE TEMP PASSWORD)
// ============================================================================

app.post("/super-admin/reset-password", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: "User ID required" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

    
    const tempPassword =
      "SARN@" + Math.floor(1000 + Math.random() * 9000);

    await ref.update({
      password: tempPassword,
      mustReset: true,
      updatedAt: Date.now(),
    });

    
    res.json({
      ok: true,
      userId: id,
      tempPassword,
    });
  } catch (err) {
    console.error("SUPER ADMIN RESET ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ============================================================================
//  SUPER ADMIN: DELETE USER
// ============================================================================

app.post("/super-admin/delete-user", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ ok: false, error: "User ID required" });
    }

    const id = userId.trim().toUpperCase();

    const ref = db.collection("users").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "User not found" });
    }

  
    if (snap.data().role === "super_admin") {
      return res.json({ ok: false, error: "Cannot delete super admin" });
    }

    await ref.delete();

    res.json({
      ok: true,
      userId: id,
    });
  } catch (err) {
    console.error("SUPER ADMIN DELETE ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
// ================= ATTENDANCE: LOGIN =================
async function markLogin(user) {
  const today = new Date().toISOString().slice(0, 10);
  const docId = `${user.userId}_${today}`;

  const ref = db.collection("attendance_logs").doc(docId);
  const snap = await ref.get();

  const now = Date.now();

  if (!snap.exists) {
    await ref.set({
      userId: user.userId,
      name: user.name,          
      role: user.role,
      date: today,

      sessions: [
        {
          loginTime: now,
          logoutTime: null,
          durationMinutes: 0,
        },
      ],

      totalMinutes: 0,
      expectedMinutes: 480,
      status: "IN_PROGRESS",
      lastUpdated: now,
    });
  } else {
    const data = snap.data();

  
    const lastSession = data.sessions[data.sessions.length - 1];
    if (lastSession && lastSession.logoutTime === null) return;

    await ref.update({
      sessions: [
        ...data.sessions,
        {
          loginTime: now,
          logoutTime: null,
          durationMinutes: 0,
        },
      ],
      status: "IN_PROGRESS",
      lastUpdated: now,
    });
  }
}

// ================= ATTENDANCE: LOGOUT =================
app.post("/auth/logout", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.json({ ok: false });

    const today = new Date().toISOString().slice(0, 10);
    const docId = `${userId}_${today}`;

    const ref = db.collection("attendance_logs").doc(docId);
    const snap = await ref.get();
    if (!snap.exists) return res.json({ ok: true });

    const data = snap.data();
    const now = Date.now();

    const sessions = [...data.sessions];
    const last = sessions[sessions.length - 1];

    if (!last || last.logoutTime) {
      return res.json({ ok: true });
    }

    last.logoutTime = now;
    last.durationMinutes = Math.floor(
      (now - last.loginTime) / 60000
    );

    const totalMinutes = sessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    await ref.update({
      sessions,
      totalMinutes,
      status: "COMPLETED",
      lastUpdated: now,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("LOGOUT ERROR", err);
    res.json({ ok: false });
  }
});


// ============================================================================
// SUPER ADMIN: FETCH ATTENDANCE (enhanced with derived fields)
// ============================================================================
app.get("/super-admin/attendance", async (req, res) => {
  try {
    const { date, month } = req.query;
    const IST_MS = 5.5 * 60 * 60 * 1000;

    let query = db.collection("attendance_logs");
    if (date) {
      query = query.where("date", "==", date);
    } else if (month) {
      query = query
        .where("date", ">=", `${month}-01`)
        .where("date", "<=", `${month}-31`);
    }

    const snap = await query.get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      const sessions = d.sessions || [];
      const totalMinutes = d.totalMinutes || 0;

      // 24-element boolean array (IST): is user active in each hour?
      const hourlyActivity = new Array(24).fill(false);
      for (const s of sessions) {
        const startMs = (s.loginTime || 0) + IST_MS;
        const endMs = (s.logoutTime || Date.now()) + IST_MS;
        const startHour = Math.floor((startMs % 86400000) / 3600000);
        const endHour = Math.floor((endMs % 86400000) / 3600000);
        let h = startHour;
        for (let i = 0; i <= 24; i++) {
          hourlyActivity[h % 24] = true;
          if (h % 24 === endHour) break;
          h++;
        }
      }

      // Late start: first login after 9:30 IST
      const firstSession = sessions[0];
      const lastSession = sessions[sessions.length - 1];
      let lateStart = false;
      if (firstSession?.loginTime) {
        const t = new Date(firstSession.loginTime + IST_MS);
        const h = t.getUTCHours(), m = t.getUTCMinutes();
        lateStart = h > 9 || (h === 9 && m > 30);
      }

      // Early logout: last logout before 17:00 IST and < 8 hrs worked
      let earlyLogout = false;
      if (lastSession?.logoutTime && totalMinutes < 480) {
        const t = new Date(lastSession.logoutTime + IST_MS);
        earlyLogout = t.getUTCHours() < 17;
      }

      // Currently active: last session has no logoutTime
      const isCurrentlyActive = !!(lastSession && !lastSession.logoutTime);
      const currentSessionMinutes = isCurrentlyActive
        ? Math.floor((Date.now() - (lastSession.loginTime || Date.now())) / 60000)
        : 0;

      return {
        id: doc.id,
        ...d,
        hourlyActivity,
        lateStart,
        earlyLogout,
        firstLoginMs: firstSession?.loginTime || null,
        lastLogoutMs: lastSession?.logoutTime || null,
        isCurrentlyActive,
        currentSessionMinutes,
        liveTotalMinutes: totalMinutes + currentSessionMinutes,
      };
    });

    res.json({ ok: true, rows });
  } catch (err) {
    console.error("ATTENDANCE FETCH ERROR:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// ============================================================================
// ACTIVITY PING — user pings every few minutes to update lastActivityAt
// ============================================================================
app.post("/user/activity-ping", async (req, res) => {
  try {
    const userId = String(req.body.userId || "").trim().toUpperCase();
    if (!userId) return res.json({ ok: false });
    const today = new Date().toISOString().slice(0, 10);
    const ref = db.collection("attendance_logs").doc(`${userId}_${today}`);
    const snap = await ref.get();
    if (snap.exists) await ref.update({ lastActivityAt: Date.now() });
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ============================================================================
// ACTIVE USERS — currently logged-in users with idle detection
// ============================================================================
app.get("/super-admin/active-users", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const snap = await db.collection("attendance_logs").where("date", "==", today).get();
    const users = [];
    snap.docs.forEach(doc => {
      const d = doc.data();
      const sessions = d.sessions || [];
      const lastSession = sessions[sessions.length - 1];
      if (!lastSession || lastSession.logoutTime) return;
      const currentSessionMinutes = Math.floor((Date.now() - (lastSession.loginTime || Date.now())) / 60000);
      const lastActivityAt = d.lastActivityAt || null;
      const idleMinutes = lastActivityAt ? Math.floor((Date.now() - lastActivityAt) / 60000) : null;
      users.push({
        userId: d.userId,
        name: d.name,
        role: d.role,
        totalMinutes: d.totalMinutes || 0,
        currentSessionMinutes,
        lastActivityAt,
        idleMinutes,
        loginTime: lastSession.loginTime,
      });
    });
    res.json({ ok: true, users });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// RECORDS TODAY — SDS + DQ + Batch completions today per user
// ============================================================================
app.get("/super-admin/records-today", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const IST_MS = 5.5 * 60 * 60 * 1000;
    const counts = {};

    function addCount(userId, type) {
      const id = String(userId || "").trim().toUpperCase();
      if (!id) return;
      if (!counts[id]) counts[id] = { sds: 0, dq: 0, batch: 0, total: 0 };
      counts[id][type]++;
      counts[id].total++;
    }

    function epochToDate(v) {
      if (!v) return null;
      const ms = typeof v === "number" ? v : (v._seconds ? v._seconds * 1000 : null);
      if (!ms) return null;
      return new Date(ms + IST_MS).toISOString().slice(0, 10);
    }

    const [sdsSheets, dqSheets, batchSheets] = await Promise.all([
      db.collection("sds_sheets").get(),
      db.collection("dq_sheets").get(),
      db.collection("batch_sheets").get(),
    ]);

    for (const sheetDoc of sdsSheets.docs) {
      const refs = await sheetDoc.ref.collection("references").get();
      refs.forEach(doc => {
        const d = doc.data();
        for (const stage of ["search", "supersede", "transcription"]) {
          const s = d[stage] || {};
          if (s.completedBy && epochToDate(s.completedAt) === today) addCount(s.completedBy, "sds");
        }
      });
    }

    for (const sheetDoc of dqSheets.docs) {
      const refs = await sheetDoc.ref.collection("references").get();
      refs.forEach(doc => {
        const d = doc.data();
        if (d.billingReady && d.dateVerified === today && d.assignedTo) addCount(d.assignedTo, "dq");
      });
    }

    for (const sheetDoc of batchSheets.docs) {
      const records = await sheetDoc.ref.collection("records").get();
      records.forEach(doc => {
        const d = doc.data();
        const v = d.verification || {};
        if (v.status === "completed" && v.dateVerified === today && v.assignedTo) addCount(v.assignedTo, "batch");
      });
    }

    res.json({ ok: true, counts });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// STREAKS — consecutive days each user met the 8-hr target
// ============================================================================
app.get("/super-admin/streaks", async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const snap = await db.collection("attendance_logs")
      .where("date", ">=", cutoffStr)
      .where("date", "<=", today)
      .get();

    const userDays = {};
    snap.docs.forEach(doc => {
      const d = doc.data();
      if (!userDays[d.userId]) userDays[d.userId] = {};
      userDays[d.userId][d.date] = (d.totalMinutes || 0) >= 480;
    });

    const streaks = {};
    for (const [userId, days] of Object.entries(userDays)) {
      let streak = 0;
      const check = new Date(today);
      for (let i = 0; i < 90; i++) {
        const ds = check.toISOString().slice(0, 10);
        if (days[ds] === true) { streak++; check.setDate(check.getDate() - 1); }
        else break;
      }
      streaks[userId] = streak;
    }

    res.json({ ok: true, streaks });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// USER TODAY PROGRESS — for the user's own dashboard widget
// ============================================================================
app.get("/user/today-progress", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim().toUpperCase();
    if (!userId) return res.json({ ok: false });
    const today = new Date().toISOString().slice(0, 10);
    const snap = await db.collection("attendance_logs").doc(`${userId}_${today}`).get();
    if (!snap.exists) return res.json({ ok: true, totalMinutes: 0, expectedMinutes: 480, isActive: false });
    const d = snap.data();
    const sessions = d.sessions || [];
    const lastSession = sessions[sessions.length - 1];
    const isActive = !!(lastSession && !lastSession.logoutTime);
    const liveMinutes = (d.totalMinutes || 0) + (isActive ? Math.floor((Date.now() - lastSession.loginTime) / 60000) : 0);
    res.json({ ok: true, totalMinutes: liveMinutes, expectedMinutes: 480, isActive, lastActivityAt: d.lastActivityAt || null });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// ATTENDANCE RETENTION — KEEP ONLY LAST 3 MONTHS
// ============================================================================

async function cleanupOldAttendance() {
  try {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setMonth(now.getMonth() - 3);

    const cutoffDate = cutoff.toISOString().slice(0, 10); 

    const snap = await db
      .collection("attendance_logs")
      .where("date", "<", cutoffDate)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    console.log(`🧹 Deleted ${snap.size} old attendance records`);
  } catch (err) {
    console.error("ATTENDANCE CLEANUP ERROR:", err);
  }
}

// SDS MODULE
/* =====================================================================
   SDS UPLOAD — FINAL FIXED (MANUFACTURER NAME BUG RESOLVED)
===================================================================== */
app.post("/sds/upload", upload.single("file"), async (req, res) => {
  try {
    const sheet = String(req.body.sheet || "").trim();
    const dueDate = String(req.body.dueDate || "").trim();
    if (!sheet || !req.file) {
      return res.json({ ok: false, error: "Sheet or file missing" });
    }
    if (!dueDate) {
      return res.json({ ok: false, error: "Due date is required" });
    }

    await db.collection("sds_sheets").doc(sheet).set(
      {
        sheetId: sheet,
        updatedAt: Date.now(),
        dueDate,
      },
      { merge: true }
    );

    
    const wb = XLSX.read(req.file.buffer, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {
      defval: "",
      raw: false,
    });

    if (!rows.length) {
      return res.json({ ok: false, error: "Empty Excel file" });
    }  

function formatDate(val) {
  if (!val && val !== 0) return "";

  // Excel number (like 44665)
  if (typeof val === "number") {
    const date = new Date((val - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  // JS Date
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }

  // String
  if (typeof val === "string") {
    const parsed = new Date(val);
    if (!isNaN(parsed)) {
      return parsed.toISOString().split("T")[0];
    }
  }

  return "";
}

    let batch = db.batch();
    let ops = 0;
    let count = 0;

    for (const r of rows) {
      console.log("INPUT:", r["Revision Date"]);
      console.log("OUTPUT:", formatDate(r["Revision Date"]));
      const refRaw =
        r["Repository Number"] ||
        r["repositoryNumber"] ||
        "";

      if (!refRaw) continue;

      const refId = normalize(refRaw);

      const common = {
        businessEntity: String(
          r["Business Entity"] || r["businessEntity"] || ""
        ).trim(),

        repositoryNumber: String(
          r["Repository Number"] || r["repositoryNumber"] || ""
        ).trim(),

        chemicalProduct: String(
          r["Chemical Product"] || r["chemicalProduct"] || ""
        ).trim(),

        manufacturerName: String(
          r["Manufacturer's Name"] ||
          r["Manufacturer Name"] ||
          r["MANUFACTURER NAME"] ||
          r["Manufacturer"] ||
          r["manufacturerName"] ||
          ""
        ).trim(),

      revisionDate: formatDate(
        r["Revision Date"] ?? r["revisionDate"]
      ),

      verificationDate: formatDate(
        r["Verification Date"] ?? r["verificationDate"]
      ),

      };

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const existingDoc = await refDoc.get();
      batch.set(
  refDoc,
  {
    referenceId: refId,
    common,
    currentStage: "search",
    workflowStatus: "ASSIGN_PENDING",
    nextStage: "search",
    
    duplicate: existingDoc.exists || false,
    duplicateUpdatedAt: existingDoc.exists ? Date.now() : null,


    updatedAt: Date.now(),
  },
  { merge: true }
);

      ops++;
      count++;

      if (ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) await batch.commit();

    res.json({ ok: true, count });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// GET UNIQUE MANUFACTURER NAMES FOR A SHEET
// ============================================================================

app.get("/admin/sds/manufacturer-names", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.manufacturerName;
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER NAME LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});


// ============================================================================
// GET UNIQUE Business enitites  (= BUSINESS ENTITIES) FOR A SHEET — FINAL
// ============================================================================

app.get("/admin/sds/manufacturers", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.businessEntity; 
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});
// ============================================================================
// GET UNIQUE MANUFACTURER NAMES FOR A SHEET
// ============================================================================

app.get("/admin/sds/manufacturer-names", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) {
      return res.json({ ok: true, manufacturers: [] });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const set = new Set();

    snap.forEach(doc => {
      const m = doc.data().common?.manufacturerName;
      if (m && String(m).trim()) {
        set.add(String(m).trim());
      }
    });

    res.json({
      ok: true,
      manufacturers: Array.from(set).sort(),
    });
  } catch (err) {
    console.error("MANUFACTURER NAME LIST ERROR:", err);
    res.status(500).json({ ok: false, manufacturers: [] });
  }
});


// ===================================================================
// GET SINGLE SDS REFERENCE (USED BY ViewReference.jsx)
// Route: /references/:company/:sheet/:refId
// ===================================================================
app.get("/references/:company/:sheet/:refId", async (req, res) => {
  try {
    const sheet = normalize(req.params.sheet);
    const refId = normalize(req.params.refId);

    const docRef = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await docRef.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const data = snap.data();

  
    res.json({
      ok: true,
      reference: {
        referenceId: refId,
        common: data.common || {},
        search: data.search || {},
        supersede: data.supersede || {},
        transcription: data.transcription || {},
        billing: data.billing || {},
        currentStage: data.currentStage || "search",
        assignedTo: data.assignedTo || null,
      },
    });
  } catch (err) {
    console.error("GET REFERENCE ERROR:", err);
    res.status(500).json({ ok: false, error: "Failed to load reference" });
  }
});

// =====================================================
// VIEW SINGLE SDS REFERENCE (Admin ViewReference.jsx)
// =====================================================
app.get("/references/:company/:sheet/:id", async (req, res) => {
  try {
   
    const company = normalize(req.params.company); // kept for frontend compatibility
    const sheet = normalize(req.params.sheet);
    const refId = normalize(req.params.id);


    if (!sheet || !refId) {
      return res.json({ ok: false, error: "Invalid parameters" });
    }

    const refSnap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId)
      .get();

    if (!refSnap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const d = refSnap.data();

   
    const reference = {
      referenceId: d.referenceId,

    
      common: d.common || {},

      search: d.search || { status: "pending" },
      supersede: d.supersede || { status: "waiting" },
      transcription: d.transcription || { status: "waiting" },
      billing: d.billing || { status: "waiting" },

      currentStage: d.currentStage || "search",
      assignedTo: d.assignedTo || null,
    };

    res.json({ ok: true, reference });
  } catch (err) {
    console.error("VIEW REFERENCE ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load reference",
    });
  }
});
// ============================================================================
// PRODUCTIVITY REPORT
// ============================================================================
app.get("/admin/workflow/productivity", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (!sheet || !fromDate || !toDate) {
      return res.json({
        ok: false,
        error: "sheet, fromDate and toDate are required",
      });
    }

    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);

    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const stats = {};

    let totalRecords = 0;
    let assignedRecords = 0;
    let completedRecords = 0;

    const stages = [
      "search",
      "supersede",
      "transcription",
      "billing",
    ];

    snap.forEach((doc) => {
      const d = doc.data();

      totalRecords++;

      stages.forEach((stage) => {
        const stageData = d[stage];

        if (!stageData) return;

        const assignedTo = stageData.assignedTo;
        const assignedAt = stageData.assignedAt;
        const completedAt = stageData.completedAt;

        // ---------------- ASSIGNED ----------------
        if (
          assignedTo &&
          assignedAt &&
          assignedAt.toDate
        ) {
          const assignDate = assignedAt.toDate();

          if (assignDate >= from && assignDate <= to) {
            assignedRecords++;

            if (!stats[assignedTo]) {
              stats[assignedTo] = {
                userId: assignedTo,
                assigned: 0,
                completed: 0,
                pending: 0,
              };
            }

            stats[assignedTo].assigned++;
          }
        }

        // ---------------- COMPLETED ----------------
        if (
          assignedTo &&
          completedAt &&
          completedAt.toDate
        ) {
          const completeDate = completedAt.toDate();

          if (completeDate >= from && completeDate <= to) {
            completedRecords++;

            if (!stats[assignedTo]) {
              stats[assignedTo] = {
                userId: assignedTo,
                assigned: 0,
                completed: 0,
                pending: 0,
              };
            }

            stats[assignedTo].completed++;
          }
        }
      });
    });

    const users = Object.values(stats).map((u) => ({
      ...u,
      pending: Math.max(0, u.assigned - u.completed),
      completionPercent:
        u.assigned > 0
          ? Number(
              ((u.completed / u.assigned) * 100).toFixed(2)
            )
          : 0,
    }));

    return res.json({
      ok: true,
      summary: {
        totalRecords,
        assignedRecords,
        completedRecords,
        headCount: users.length,
      },
      users,
    });
  } catch (err) {
    console.error("PRODUCTIVITY ERROR:", err);

    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

//GET /admin/workflow/user-assigned-report
app.get("/admin/workflow/user-assigned-report", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const userId = req.query.userId;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;

    if (!sheet || !userId || !fromDate || !toDate) {
      return res.json({
        ok: false,
        rows: [],
      });
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const rows = [];

    snap.forEach(doc => {
      const d = doc.data();

      [
        { name: "search", data: d.search },
        { name: "supersede", data: d.supersede },
        { name: "transcription", data: d.transcription },
        { name: "billing", data: d.billing },
      ].forEach(stage => {
        if (!stage.data?.assignedTo) return;

        if (stage.data.assignedTo !== userId) return;

        if (!stage.data.assignedAt) return;

        const assignedDate =
          stage.data.assignedAt.toDate
            ? stage.data.assignedAt.toDate()
            : new Date(stage.data.assignedAt);

        if (assignedDate < from || assignedDate > to) return;

        rows.push({
          repositoryNumber:
            d.common?.repositoryNumber || "",
          referenceId:
            d.referenceId || doc.id,
          stage: stage.name,
          assignedTo: userId,
          assignedDate,
          businessEntity:
            d.common?.businessEntity || "",
          chemicalProduct:
            d.common?.chemicalProduct || "",
        });
      });
    });

    return res.json({
      ok: true,
      total: rows.length,
      rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      rows: [],
    });
  }
});
// =====================================================================
// GET SDS SHEETS — SINGLE SOURCE OF TRUTH (DO NOT DUPLICATE)
// =====================================================================
app.get("/sds/sheets", async (req, res) => {
  try {
    const snap = await db.collection("sds_sheets").get();
    const sheets = snap.docs.map(d => d.id);

    console.log("📄 SDS SHEETS:", sheets);

    return res.json({
      ok: true,
      sheets,                 
      companies: ["SARN"],    
    });
  } catch (err) {
    console.error("SDS SHEETS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load SDS sheets",
    });
  }
});

// ============================================================================
//  USERS (ASSIGN PAGE)
// ============================================================================
app.get("/users", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map(d => d.data());
    res.json({ ok: true, users });
  } catch (err) {
    console.error("USERS ERROR:", err);
    res.status(500).json({ ok: false });
  }
});



// ============================================================================
//  SDS ASSIGN (ASSIGN PAGE)
// ============================================================================
app.post("/sds/assign", async (req, res) => {
  try {
    console.log("ASSIGN BODY:", req.body);
    const { company, sheet, refIds, userId } = req.body;

    if (!sheet || !userId || !Array.isArray(refIds)) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const sheetId = normalize(sheet);
    const assignee = normalize(userId);

    const batch = db.batch();

    for (const r of refIds) {
      const refId = normalize(r);

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheetId)
        .collection("references")
        .doc(refId);

      batch.set(
        refDoc,
        {
          assignedTo: assignee,
          assignedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    res.json({ ok: true });
  } catch (err) {
    console.error("SDS ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// SDS BULK ASSIGN BY COMPANY (ADMIN)
// ============================================================================

app.post("/sds/assign/by-company", async (req, res) => {
  try {
    const { sheet, company, userId } = req.body;

    if (!sheet || !company || !userId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const sheetId = normalize(sheet);
    const companyName = company.trim();
    const assignee = normalize(userId);

    const snap = await db
      .collection("sds_sheets")
      .doc(sheetId)
      .collection("references")
      .where("manufacturerName", "==", companyName)
      .where("assignedTo", "==", null)
      .get();

    if (snap.empty) {
      return res.json({ ok: true, assigned: 0 });
    }

    const batch = db.batch();
    let count = 0;

    snap.forEach(doc => {
      batch.set(
        doc.ref,
        {
          assignedTo: assignee,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          assignmentMode: "BULK_COMPANY",
        },
        { merge: true }
      );
      count++;
    });

    await batch.commit();

    res.json({ ok: true, assigned: count });
  } catch (err) {
    console.error("BULK ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});
// ============================================================================
// SDS REASSIGN (ADMIN ONLY)
// ============================================================================

app.post("/sds/reassign", async (req, res) => {
  try {
    const { sheet, refId, newUserId, reason } = req.body;

    if (!sheet || !refId || !newUserId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(normalize(sheet))
      .collection("references")
      .doc(normalize(refId));

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    await refDoc.set(
      {
        reassignedFrom: snap.data().assignedTo || null,
        assignedTo: normalize(newUserId),
        assignmentStatus: "REASSIGNED",
        reassignedAt: admin.firestore.FieldValue.serverTimestamp(),
        reassignReason: reason || "Admin reassignment",
      },
      { merge: true }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("REASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// ADMIN – LIST REFERENCES (SINGLE SOURCE OF TRUTH — FINAL + COMPANY + MANUFACTURER FILTER)
// ============================================================================

app.get("/admin/workflow/list", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const stage = req.query.stage;
    const company = req.query.company;
    const { repositoryNo } = req.query;
console.log("REPOSITORY SEARCH:", repositoryNo);
   
    let manufacturer = req.query.manufacturer;
    if (manufacturer && !Array.isArray(manufacturer)) {
      manufacturer = [manufacturer]; 
    }

    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if ((!sheet && !repositoryNo) || !stage) {
      return res.json({ ok: false, rows: [], total: 0 });
    }

    let sheetDocs = [];

if (repositoryNo && !sheet) {
  const allSheets = await db.collection("sds_sheets").get();

  for (const sheetDoc of allSheets.docs) {
    const refs = await sheetDoc.ref
      .collection("references")
      .get();

    refs.forEach(doc => {
      sheetDocs.push({
        sheetName: sheetDoc.id,
        doc
      });
    });
  }
} else {
  const snap = await db
    .collection("sds_sheets")
    .doc(sheet)
    .collection("references")
    .get();

  snap.forEach(doc => {
    sheetDocs.push({
      sheetName: sheet,
      doc
    });
  });
}
  if (stage === "billing") {
  return res.json({
    ok: true,
    rows: [],
    total: 0,
  });
}

    const rows = [];

    
sheetDocs.forEach(({ sheetName, doc }) => {
 
  const d = doc.data();
 console.log(
  "DOC REPO:",
  d.common?.repositoryNumber
);
  const isAssignable =
    stage !== "billing" &&
    d.workflowStatus === "ASSIGN_PENDING" &&
    d.nextStage === stage;

  const isActiveStage =
    d.workflowStatus !== "ASSIGN_PENDING" &&
    d.currentStage === stage;

      if (!isAssignable && !isActiveStage) return;

      const businessEntity = d.common?.businessEntity || "";
      const manufacturerName = d.common?.manufacturerName || "";
      const repoNo = d.common?.repositoryNumber || "";
      if (
  repositoryNo &&
  !repoNo.toLowerCase().includes(repositoryNo.toLowerCase())
) {
  return;
}

     
      if (company && businessEntity !== company) return;

      
      if (
        manufacturer &&
        manufacturer.length &&
        !manufacturer.includes(manufacturerName)
      ) {
        return;
      }

      rows.push({
        sheetName,
        referenceId: d.referenceId || doc.id,
        repositoryNumber: repoNo,
        businessEntity,
        manufacturerName,
        chemicalProduct: d.common?.chemicalProduct || "",
        currentStage: d.currentStage || stage,
        assignedTo: d[stage]?.assignedTo || null,
        comments2: d.search?.comments2 || "",
        newRepositoryNumber:
    d.supersede?.newRepositoryNumber || "",
      });
    });

    const total = rows.length;

    const start = (page - 1) * pageSize;
    const paged = rows.slice(start, start + pageSize);

    return res.json({ ok: true, rows: paged, total });
  } catch (err) {
    console.error("ADMIN WORKFLOW LIST ERROR:", err);
    res.status(500).json({ ok: false, rows: [], total: 0 });
  }
});


// ============================================================================
// SDS LIST — SINGLE SOURCE OF TRUTH (USED BY ADMIN + USER)
// URL: /sds/list?sheet=TEST_4&page=1&pageSize=100
// ============================================================================

app.get("/sds/list", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if (!sheet) {
      return res.status(400).json({
        ok: false,
        error: "Sheet missing",
      });
    }

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("referenceId")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        referenceId: d.referenceId || doc.id,
        currentStage: d.currentStage || "search",
        assignedTo: d.assignedTo || null,
        workflowStatus: d.workflowStatus || "",

        common: d.common || null,
        search: d.search || null,
        supersede: d.supersede || null,
        transcription: d.transcription || null,
        billing: d.billing || null,
      };
    });

    const start = (page - 1) * pageSize;

    return res.json({
      ok: true,
      rows: rows.slice(start, start + pageSize),
      total: rows.length,
    });
  } catch (err) {
    console.error("❌ SDS LIST ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load SDS list",
    });
  }
});

// ============================================================================
// EXPORT SDS DATABASE — CONTENT ONLY (NO STATUS / NO ASSIGNMENT)
// ============================================================================

app.get("/admin/sds/database/export", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    if (!sheet) return res.status(400).end();

    const snap = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    const rows = snap.docs.map(doc => {
      const x = doc.data();

      return {
        /* ================= BASIC ================= */
        ReferenceID: doc.id,

        /* ================= COMMON ================= */
        BusinessEntity: x.common?.businessEntity || "",
        RepositoryNumber: x.common?.repositoryNumber || "",
        ChemicalProduct: x.common?.chemicalProduct || "",
        ManufacturerName: x.common?.manufacturerName || "",
        RevisionDate: x.common?.revisionDate || "",
        VerificationDate: x.common?.verificationDate || "",

        /* ================= SEARCH ================= */
        Search_Websearch1: x.search?.websearch1 || "",
        Search_Websearch2: x.search?.websearch2 || "",
        Search_Comments1: x.search?.comments1 || "",
        Search_Comments2: x.search?.comments2 || "",
        Search_Remarks: x.search?.remarks || "",
        Search_SupersedeObservation: x.search?.supersedeObservation || "",
        Search_StartDate: x.search?.startDate || "",
        Search_EndDate: x.search?.endDate || "",
        Search_NotPublishable: x.search?.notPublishable ? "YES" : "NO",
        Search_NotPublishableReason: x.search?.notPublishableRemarks || "",

        /* ================= SUPERSEDE ================= */
        Supersede_NewRepositoryNumber: x.supersede?.newRepositoryNumber || "",
        Supersede_Date: x.supersede?.supersedeDate || "",
        Supersede_VerifiedDate: x.supersede?.verifiedDate || "",
        Supersede_Comments1: x.supersede?.comments1 || "",
        Supersede_Comments2: x.supersede?.comments2 || "",
        Supersede_Remarks: x.supersede?.remarks || "",

        /* ================= TRANSCRIPTION ================= */
        Transcription_VerifiedDate: x.transcription?.verifiedDate || "",
        Transcription_Comments1: x.transcription?.comments1 || "",
        Transcription_Comments2: x.transcription?.comments2 || "",
        Transcription_Remarks: x.transcription?.remarks || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "SDS_DATABASE");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sheet}_SDS_DATABASE.xlsx`
    );
    res.send(buf);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).end();
  }
});


// =======================================================
// SEARCH SUBMIT (USER) — FINAL & WORKING
// =======================================================
app.post(
  "/sds/workflow/search",
  upload.single("pdf"),
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({ ok: false, error: "Missing fields" });
      }

      /* ===== NOT PUBLISHABLE FLAG ===== */
      const notPublishable =
        req.body.notPublishable === "true" ||
        req.body.notPublishable === true;

      /* ===== PDF UPLOAD ===== */
      let pdfUrl = null;

      if (req.file) {
        const filePath = `sds/${sheet}/${refId}/search.pdf`;
        const file = bucket.file(filePath);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          resumable: false,
        });

        await file.makePublic();

        pdfUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      }

      /* ===== LANGUAGE ===== */
      const rawLang = String(req.body.language || "English").trim();
      const langOther = String(req.body.languageOther || "").trim();
      const resolvedLanguage = rawLang === "Others" && langOther ? `Others: ${langOther}` : rawLang || "English";
      const isMultilingual = resolvedLanguage.toLowerCase() !== "english";

      /* ===== SEARCH DATA ===== */
      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      const searchData = {
        searchType: req.body.searchType || "",
        websearch1: req.body.websearch1 || "",
        websearch2: req.body.websearch2 || "",
        mailId: req.body.mailId || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        supersedeObservation: req.body.supersedeObservation || "",
        startDate: req.body.startDate || "",
        endDate: req.body.endDate || "",

        notPublishable,
        notPublishableReason: notPublishable
          ? req.body.notPublishableReason || ""
          : "",

        language: resolvedLanguage,
        isMultilingual,

        pdfUrl,

        user: userId,

        status: "completed",

        completedBy: userId,
        completedStage: "search",

        completedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      };  


/* ===== DECIDE NEXT STAGE ===== */

let nextStage;
let workflowStatus = "ASSIGN_PENDING";
let assignedTo = null;
let holdUntil = null;

if (notPublishable) {
  nextStage = "transcription";
} else {
  nextStage = "supersede";
}

/* ===== SAVE TO FIRESTORE ===== */

await db
  .collection("sds_sheets")
  .doc(sheet)
  .collection("references")
  .doc(refId)
  .update(
    {
      search: searchData,

      "common.language": resolvedLanguage,
      "common.isMultilingual": isMultilingual,

      currentStage: nextStage,
      workflowStatus,
      assignedTo,

      nextStage,
      holdUntil,

      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
  );

return res.json({
  ok: true,
  nextStage,
});

} catch (err) {
  console.error("SEARCH SUBMIT ERROR:", err);
  return res.status(500).json({ ok: false });
}
});

// ============================================================================
// SUPERSEDE STAGE SUBMIT (USER) — PDF ENABLED, PROD SAFE
// ============================================================================

app.post(
  "/sds/workflow/supersede",
  upload.single("pdf"), // ✅ ENABLE FILE UPLOAD
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({ ok: false, error: "Missing required fields" });
      }

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      if (!snap.exists) {
        return res.json({ ok: false, error: "Reference not found" });
      }

      if (snap.data()?.supersede?.status === "completed") {
        return res.json({
          ok: false,
          error: "Supersede already completed",
        });
      }

      /* ================= PDF UPLOAD ================= */
      let pdfUrl = null;

      if (req.file) {
        const filePath = `sds/${sheet}/${refId}/supersede.pdf`;
        const file = bucket.file(filePath);

        await file.save(req.file.buffer, {
          contentType: req.file.mimetype,
          resumable: false,
        });

       await file.makePublic();

      pdfUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
      }

      /* ================= SUPERSEDE DATA ================= */
      const supersedeData = {
        newRepositoryNumber: req.body.newRepositoryNumber || "",
        supersedeDate: req.body.supersedeDate || "",
        verifiedDate: req.body.verifiedDate || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        remarks1: req.body.remarks1 || "",
        remarks2: req.body.remarks2 || "",

        pdfUrl, 

        user: userId,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await refDoc.set(
      {
        supersede: supersedeData,

        referencePdfUrl:
          pdfUrl || admin.firestore.FieldValue.delete(),

        workflowStatus: "ASSIGN_PENDING",

        currentStage: "transcription",

        nextStage: "transcription",

        assignedTo: null,

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
      );
      return res.json({
        ok: true,
        nextStage: "transcription",
      });
       } catch (err) {
      console.error("SEARCH SUBMIT ERROR:", err);
      return res.status(500).json({ ok: false });
    }
  }
);


// ============================================================================
// TRANSCRIPTION SUBMIT — FINAL (SEND TO BILLING)
// ============================================================================
app.post(
  "/sds/workflow/transcription",
  upload.none(),
  async (req, res) => {
    try {
      const sheet = String(req.body.sheet || "").trim();
      const refId = String(req.body.refId || "").trim();
      const userId = String(req.body.userId || "").trim();

      if (!sheet || !refId || !userId) {
        return res.json({
          ok: false,
          error: "Missing required fields",
        });
      }

      const refDoc = db
        .collection("sds_sheets")
        .doc(sheet)
        .collection("references")
        .doc(refId);

      const snap = await refDoc.get();
      if (!snap.exists) {
        return res.json({ ok: false, error: "Reference not found" });
      }

      if (snap.data()?.transcription?.status === "completed") {
        return res.json({
          ok: false,
          error: "Transcription already completed",
        });
      }

      const transcriptionData = {
        verifiedDate: req.body.verifiedDate || "",
        comments1: req.body.comments1 || "",
        comments2: req.body.comments2 || "",
        remarks: req.body.remarks || "",
        remarks1: req.body.remarks1 || "",
        remarks2: req.body.remarks2 || "",
        user: userId,
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedBy: userId,
        completedStage: "transcription"
      };

      await refDoc.set(
        {
          transcription: transcriptionData,

         
          billing: {
            status: "ready",
            readyAt: admin.firestore.FieldValue.serverTimestamp(),
          },

          currentStage: "billing",
          workflowStatus: "BILLING_READY", 
          nextStage: null,
          assignedTo: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        nextStage: "billing",
      });
    } catch (err) {
      console.error("❌ TRANSCRIPTION SUBMIT ERROR:", err);
      return res.status(500).json({
        ok: false,
        error: "Transcription submit failed",
      });
    }
  }
);


// ===================================================================
// USER: LOAD SDS WORKFLOW — FINAL FIX
// ===================================================================
app.get("/user/workflow/:sheet/:refId", async (req, res) => {
  try {
    const sheet = normalize(req.params.sheet); 
    const refId = req.params.refId;             

    const doc = await db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId)
      .get();

    if (!doc.exists) {
      console.log("❌ REF NOT FOUND:", sheet, refId);
      return res.json({ ok: false, error: "Reference not found" });
    }

    res.json({ ok: true, workflow: doc.data() });
  } catch (err) {
    console.error("USER WORKFLOW LOAD ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

// ===================================================================
// USER: GET ASSIGNED SDS TASKS — FINAL & CORRECT
// ===================================================================
app.get("/user/sds-tasks", async (req, res) => {
  try {
    let { userId } = req.query;
    if (!userId) return res.json({ ok: true, tasks: [] });

    userId = userId.trim().toUpperCase();
    const tasks = [];

    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheet = sheetDoc.id;

      const refsSnap = await sheetDoc.ref
        .collection("references")
        .get();

      refsSnap.forEach(refDoc => {
        const d = refDoc.data();
        const stage = d.currentStage || "search";

        const stageBlock = d[stage];

        if (
          stageBlock &&
          stageBlock.assignedTo &&
          stageBlock.assignedTo.toUpperCase() === userId &&
          stageBlock.status !== "completed"
        ) {
          const common = d.common || {};

          tasks.push({
            company: "SARN",
            sheet,
            referenceId: refDoc.id,
            stage,
            status: stageBlock.status || "pending",
            assignedAt: stageBlock.assignedAt || d.updatedAt || null,
            revisionDate: common.revisionDate || "",
            verificationDate: common.verificationDate || "",
          });
        }
      });
    }

    console.log("✅ USER TASKS:", tasks);
    res.json({ ok: true, tasks });
  } catch (err) {
    console.error("USER SDS TASK ERROR:", err);
    res.status(500).json({ ok: false, tasks: [] });
  }
});

// ===================================================================
// WORKFLOW DETAILS — SINGLE SOURCE OF TRUTH (ADMIN + USER)
// ===================================================================
app.get("/workflow/details", async (req, res) => {
  try {
    const sheet = normalize(req.query.sheet);
    const refId = normalize(req.query.refId);

    if (!sheet || !refId) {
      return res.status(400).json({
        ok: false,
        error: "Missing sheet or refId",
      });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.status(404).json({
        ok: false,
        error: "Reference not found",
      });
    }

    const d = snap.data();
    const currentStage = d.currentStage || "search";

    res.json({
      ok: true,
      workflow: {
        referenceId: d.referenceId || refId,
        sheet,

      
        common: d.common || {},

     
        currentStage,
        workflowStatus: d.workflowStatus || "IN_PROGRESS",
        nextStage: d.nextStage || null,

       
        assignedTo: d[currentStage]?.assignedTo || null,

      
        search: d.search || { status: "waiting" },
        supersede: d.supersede || { status: "waiting" },
        transcription: d.transcription || { status: "waiting" },
        billing: d.billing || { status: "waiting" },

      
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null,
      },
    });
  } catch (err) {
    console.error("WORKFLOW DETAILS ERROR:", err);
    res.status(500).json({
      ok: false,
      error: "Failed to load workflow",
    });
  }
});


// ============================================================================
// USER WORKFLOW — LOAD BY referenceId ONLY (FINAL FIX)
// Used by WorkflowUserView.jsx
// ============================================================================

app.get("/user/work/:refId", async (req, res) => {
  try {
    const refId = normalize(req.params.refId);

    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const refSnap = await sheetDoc.ref
        .collection("references")
        .doc(refId)
        .get();

      if (refSnap.exists) {
        const d = refSnap.data();

        return res.json({
          ok: true,
          workflow: {
            referenceId: refId,
            sheet: sheetDoc.id,
            common: d.common || {},
            currentStage: d.currentStage || "search",

            search: d.search || {},
            supersede: d.supersede || {},
            transcription: d.transcription || {},
            billing: d.billing || {},

            assignedTo:
              d[d.currentStage]?.assignedTo || null,

            createdAt: d.createdAt || null,
            updatedAt: d.updatedAt || null,
          },
        });
      }
    }

    return res.json({ ok: false, error: "Reference not found" });
  } catch (err) {
    console.error("USER WORK LOAD ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

//sds completed work
app.get("/user/completed-sds-tasks", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim().toUpperCase();
    const sheetParam = String(req.query.sheet || "").trim();

    const tasks = [];
    let assignedCount = 0, pendingCount = 0, completedCount = 0;
    const userSheets = new Set();
    const STAGES = ["search", "supersede", "transcription"];

    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheet = sheetDoc.id;
      const refsSnap = await sheetDoc.ref.collection("references").get();

      refsSnap.forEach(doc => {
        const d = doc.data();
        let userInRef = false;

        STAGES.forEach(stageName => {
          const s = d[stageName] || {};
          const isAssigned  = s.assignedTo?.toUpperCase()  === userId;
          const isCompleted = s.completedBy?.toUpperCase() === userId;

          if (!isAssigned && !isCompleted) return;
          userInRef = true;

          // Summary counts: sheet-filtered, no date filter
          if (!sheetParam || sheet === sheetParam) {
            if (isAssigned) {
              assignedCount++;
              if (s.status === "completed") completedCount++;
              else pendingCount++;
            }
          }

          // One table row per completed stage (sheet-filtered)
          if (isCompleted) {
            if (sheetParam && sheet !== sheetParam) return;
            tasks.push({
              referenceId: doc.id,
              company: "SARN",
              sheet,
              stage: stageName,
              status: "completed",
              completedAt: s.completedAt || d.updatedAt || null,
            });
          }
        });

        if (userInRef) userSheets.add(sheet);
      });
    }

    tasks.sort((a, b) => {
      const ta = a.completedAt?._seconds ?? a.completedAt ?? 0;
      const tb = b.completedAt?._seconds ?? b.completedAt ?? 0;
      return tb - ta;
    });

    return res.json({
      ok: true,
      tasks,
      sheets: Array.from(userSheets).sort(),
      summary: { assignedCount, pendingCount, completedCount },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false });
  }
});

// ============================================================================
// ADMIN WORKFLOW ASSIGN (ONLY PLACE THAT MOVES STAGE)
// Admin assigns user for next stage
// ============================================================================

app.post("/admin/workflow/assign", async (req, res) => {
  try {
    const { sheet, refId, stage, userId } = req.body;
    if (stage === "billing") {
  return res.json({
    ok: false,
    error: "Billing cannot be assigned",
  });
}

    if (!sheet || !refId || !stage || !userId) {
      return res.json({ ok: false, error: "Missing required fields" });
    }

    const sheetId = normalize(sheet);
    const referenceId = normalize(refId);

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(referenceId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const d = snap.data();

    if (d?.[stage]?.status === "completed") {
      return res.json({
        ok: false,
        error: `${stage} already completed`,
      });
    }

    await refDoc.set(
      {
        currentStage: stage,
        workflowStatus: "IN_PROGRESS",

       
        nextStage: null,

        [stage]: {
        status: "pending",
        assignedTo: userId,
        assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      },

        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error("ADMIN ASSIGN ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});



// ============================================================================
// ADMIN – BULK ASSIGN WORKFLOW STAGE
// ============================================================================

app.post("/admin/workflow/assign-bulk", async (req, res) => {
  try {
    const { sheet, refIds, stage, userId } = req.body;
    if (stage === "billing") {
  return res.json({
    ok: false,
    error: "Billing cannot be assigned",
  });
}

    if (!sheet || !refIds || !stage || !userId) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const batch = db.batch();

    refIds.forEach(refId => {
      const refDoc = db
        .collection("sds_sheets")
        .doc(normalize(sheet))
        .collection("references")
        .doc(normalize(refId));

      batch.set(
        refDoc,
        {
          currentStage: stage,
          workflowStatus: "IN_PROGRESS",

          nextStage: null,

          [stage]: {
          status: "pending",
          assignedTo: userId,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
        },

          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();

    res.json({ ok: true });
  } catch (err) {
    console.error("BULK ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});
function extractContentOnly(ref) {
  return {
    /* ================= COMMON ================= */
    ...ref.common,

    /* ================= SEARCH ================= */
    ...(ref.search ? {
      search_websearch1: ref.search.websearch1 || "",
      search_websearch2: ref.search.websearch2 || "",
      search_comments1: ref.search.comments1 || "",
      search_comments2: ref.search.comments2 || "",
      search_remarks: ref.search.remarks || "",
      search_supersedeObservation: ref.search.supersedeObservation || "",
      search_startDate: ref.search.startDate || "",
      search_endDate: ref.search.endDate || "",
    } : {}),

    /* ================= SUPERSEDE ================= */
    ...(ref.supersede && ref.supersede.status === "completed" ? {
      supersede_newRepositoryNumber: ref.supersede.newRepositoryNumber || "",
      supersede_supersedeDate: ref.supersede.supersedeDate || "",
      supersede_verifiedDate: ref.supersede.verifiedDate || "",
      supersede_comments1: ref.supersede.comments1 || "",
      supersede_comments2: ref.supersede.comments2 || "",
      supersede_remarks: ref.supersede.remarks || "",
    } : {}),

    /* ================= TRANSCRIPTION ================= */
    ...(ref.transcription && ref.transcription.status === "completed" ? {
      transcription_verifiedDate: ref.transcription.verifiedDate || "",
      transcription_comments1: ref.transcription.comments1 || "",
      transcription_comments2: ref.transcription.comments2 || "",
      transcription_remarks: ref.transcription.remarks || "",
    } : {}),
  };
}
// =====================================================
// UPDATE STATUS (SEARCH STAGE ONLY)
// =====================================================
app.post("/sds/workflow/update-status", async (req, res) => {
  console.log("NEW UPDATE STATUS ROUTE V2");
  try {
    const sheet = String(req.body.sheet || "").trim();
    const refId = String(req.body.refId || "").trim();
    const userId = String(req.body.userId || "").trim();
    const status = String(req.body.status || "").trim();
    console.log("================================");
    console.log("UPDATE STATUS ROUTE HIT");
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("================================");

    if (!sheet || !refId || !userId || !status) {
      return res.json({ ok: false, error: "Missing fields" });
    }

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Reference not found" });
    }

    const data = snap.data();

const rawLang = String(req.body.language || "English").trim();
const langOther = String(req.body.languageOther || "").trim();
const resolvedLanguage = rawLang === "Others" && langOther ? `Others: ${langOther}` : rawLang || "English";
const isMultilingual = resolvedLanguage.toLowerCase() !== "english";

const updatedSearch = {
  ...(data.search || {}),

  status,

  searchType: req.body.searchType || "",
  comments1: req.body.comments1 || "",
  comments2: req.body.comments2 || "",

  websearch1: req.body.websearch1 || "",
  websearch2: req.body.websearch2 || "",
  websearch3: req.body.websearch3 || "",

  mailId: req.body.mailId || "",

  remarks: req.body.remarks || "",

  supersedeObservation:
    req.body.supersedeObservation || "",

  startDate: req.body.startDate || "",
  endDate: req.body.endDate || "",

  notPublishable:
    req.body.notPublishable === true ||
    req.body.notPublishable === "true",

  language: resolvedLanguage,
  isMultilingual,

  draftSaved: true,

  statusUpdatedBy: userId,
  statusUpdatedAt:
    admin.firestore.FieldValue.serverTimestamp(),
};
console.log(
  "UPDATED SEARCH:",
  JSON.stringify(updatedSearch, null, 2)
);

await refDoc.update(
  {
    search: updatedSearch,
    "common.language": resolvedLanguage,
    "common.isMultilingual": isMultilingual,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }
);

    return res.json({ ok: true });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});

// =====================================================
// SDS Billing
// =====================================================
app.post("/sds/workflow/billing", async (req, res) => {
  try {
    const { sheet, refId, adminId } = req.body;

    const refDoc = db
      .collection("sds_sheets")
      .doc(sheet)
      .collection("references")
      .doc(refId);

    await refDoc.set(
      {
        billing: {
          status: "completed",
          completedBy: adminId,
          completedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        },

        workflowStatus: "COMPLETED",
        currentStage: "completed",
        nextStage: null,
      },
      { merge: true }
    );

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false });
  }
});



// =====================================================
//                DQ Module
// =====================================================

// =====================================================
// DQ UPLOAD – EXCEL → FIRESTORE (FIXED)
// =====================================================
// ======================= DQ UPLOAD (CRASH-PROOF) =======================
app.post("/dq/upload", upload.single("file"), async (req, res) => {
  try {
    const rawSheet = req.body.sheet;
    const dueDate = String(req.body.dueDate || "").trim();
    if (!rawSheet) return errJson(res, "Sheet required", 400);
    if (!req.file) return errJson(res, "File required", 400);
    if (!dueDate) return errJson(res, "Due date is required", 400);

    const sheet = normalizeSheetName(rawSheet);

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) return errJson(res, "Empty Excel", 400);

    const refCol = db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references");

    const batch = db.batch();
    let added = 0;

    for (const row of rows) {
      const repoId = String(
        row["SDS #"] ||
        row["SDS#"] ||
        row["Repo ID"] ||
        Object.values(row)[0] ||
        ""
      )
        .trim()
        .toUpperCase(); 

      if (!repoId) continue;

      const docRef = refCol.doc(repoId);

      batch.set(docRef, {
        repoId,
        common: {
          sdsNumber: repoId,
          chemicalProduct:
            row["Chemical Product / Cost Apportionment"] ||
            row["Chemical Product"] ||
            "",
          manufacturer: row["Manufacturer"] || "",
          revisionDate: row["Revision Date"] || "",
          language: row["Language"] || "",
          sdsStatus: row["SDS Status"] || "",
          lastUpdatedDate: row["Last Updated Date"] || "",
          daysInQueue: row["Days in Queue"] || "",
          sitesInUse: row["Sites In Use"] || "",
          supersede: row["Supersede"] || "",
        },
        assignedTo: "",
        status: "pending",
        billingReady: false,
        currentStage: "transcription",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      added++;
    }

    if (added > 0) await batch.commit();

    await db
      .collection("dq_sheets")
      .doc(sheet)
      .set({ createdAt: Date.now(), dueDate }, { merge: true });

    return res.json({ ok: true, added });
  } catch (err) {
    console.error("🔥 DQ UPLOAD CRASH:", err);
    return errJson(res, err.message || "Upload failed");
  }
});

// =====================================================
// DQ ASSIGN — HARD LOCK (FINAL)
// =====================================================
app.post("/dq/assign", async (req, res) => {
  try {
    const { sheet, repoId, userId } = req.body;

    if (!sheet || !repoId || !userId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = String(repoId).trim();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "Repo not found" });
    }

    const data = snap.data();

   
    if (data.assignedTo) {
      return res.json({
        ok: false,
        error: "Already assigned",
      });
    }

    await refDoc.update({
      assignedTo: userId,
      assignedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ ASSIGN ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ REASSIGN — ADMIN OVERRIDE (HOLIDAY / EMERGENCY)
// =====================================================
app.post("/dq/reassign", async (req, res) => {
  try {
    const { sheet, repoId, newUserId, reason } = req.body;

    if (!sheet || !repoId || !newUserId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = String(repoId).trim();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "Repo not found" });
    }

    const prevUser = snap.data().assignedTo || null;

    await refDoc.update({
      assignedTo: newUserId,
      reassignedFrom: prevUser,
      reassignedAt: Date.now(),
      reassignReason: reason || "Admin reassignment",
      assignmentStatus: "REASSIGNED",
      updatedAt: Date.now(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ REASSIGN ERROR:", err);
    return res.status(500).json({ ok: false });
  }
});


// =====================================================
// ADMIN – DQ WORKFLOW (FINAL FIXED)
// =====================================================
app.get("/admin/dq/workflow", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

   
    let all = snap.docs.map(doc => {
      const x = doc.data();
      const assignedTo = x.assignedTo || "";
      const billingReady = x.billingReady === true;

      let status = "unassigned";
      if (billingReady) status = "completed";
      else if (assignedTo) status = "assigned";

      return {
        repoId: x.repoId || doc.id, 
        stage: x.currentStage || "transcription",
        assignedTo,
        status,
        billingReady,
      };
    });

    const total = all.length;

   
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize);

    res.json({
      ok: true,
      rows,
      total,
    });
  } catch (err) {
    console.error("ADMIN DQ WORKFLOW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// ADMIN – FORCE MOVE TO BILLING (BULLETPROOF)
// =====================================================
app.post("/admin/dq/force-complete", async (req, res) => {
  try {
    const { sheet, repoId } = req.body;

    if (!sheet || !repoId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const sheetKey = String(sheet).trim().toUpperCase();
    const repoKey = String(repoId).trim();

  
    const snap = await db
      .collection("dq_sheets")
      .doc(sheetKey)
      .collection("references")
      .where("repoId", "==", repoKey)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ ok: false, error: "DQ record not found" });
    }

    const docRef = snap.docs[0].ref;

    await docRef.update({
      assignedTo: "__FORCE_BILLED__",    
      currentStage: "force_billed",       
      billingReady: true,                
      billingForced: true,
      billingForcedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ FORCE COMPLETE ERROR:", err);
    return res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ LIST – DATABASE / ASSIGN / LIST (EXTENDED)
// =====================================================
app.get("/dq/list", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 100);
    const search = String(req.query.search || "").trim().toUpperCase();
    const filter = String(req.query.filter || "ALL").toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

  
    let all = snap.docs.map(doc => {
      const x = doc.data();

      const isForceBilled = x.assignedTo === "__FORCE_BILLED__";

      const billingReady =
        x.billingReady === true ||
        x.billing?.ready === true;

      return {
        repoId: x.repoId || doc.id,

      
        stage: isForceBilled
          ? "force_billed"
          : x.currentStage || "transcription",

        assignedTo: x.assignedTo || "",

      
        locked: Boolean(x.assignedTo),

        billingReady,
      };
    });

  
    if (search) {
      all = all.filter(r =>
        String(r.repoId).toUpperCase().includes(search)
      );
    }

   
    if (filter === "ASSIGNED") {
      all = all.filter(r => r.locked);
    } else if (filter === "UNASSIGNED") {
      all = all.filter(r => !r.locked);
    } else if (filter === "READY") {
      all = all.filter(r => r.billingReady);
    }

    const total = all.length;

   
    const start = (page - 1) * pageSize;
    const rows = all.slice(start, start + pageSize);

    res.json({
      ok: true,
      rows,
      total,
    });
  } catch (err) {
    console.error("DQ LIST ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// DQ EXPORT – ONLY COMMON + USER WORK (STRICT HEADERS)
// =====================================================
app.get("/dq/export", async (req, res) => {
  try {
    if (!req.query.sheet) {
      return res.status(400).json({ ok: false, error: "Sheet required" });
    }

    const sheet = req.query.sheet.toUpperCase();

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .get();

    if (snap.empty) {
      return res.status(404).json({ ok: false, error: "No records found" });
    }

    
    const HEADERS = [
      "SDS #",
      "Chemical Product",
      "Manufacturer",
      "Revision Date",
      "Language",
      "SDS Status",
      "Days in Queue",
      "Sites In Use",
      "Supersede",

      "Completed By",
      "Date Verified",
      "Remarks"
    ];

    /* 🔁 BUILD ROWS – NO EXTRA KEYS ALLOWED */
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      const c = d.common || {};
      const w = d.userWork || {};

      const row = {
        "SDS #": c.sdsNumber || d.repoId || "",
        "Chemical Product": c.chemicalProduct || "",
        "Manufacturer": c.manufacturer || "",
        "Revision Date": c.revisionDate || "",
        "Language": c.language || "",
        "SDS Status": c.sdsStatus || "",
        "Days in Queue": c.daysInQueue || "",
        "Sites In Use": c.sitesInUse || "",
        "Supersede": c.supersede || "",
        "Completed By": w.completedBy || "",
        "Date Verified": w.dateVerified || "",
        "Comments": w.comments1 || "",
        "Comments 2": w.comments2 || "",

        "Remarks": w.remarks || ""
      };

      /* 🚫 HARD FILTER – REMOVE ANY UNWANTED KEYS */
      return HEADERS.reduce((acc, key) => {
        acc[key] = row[key] || "";
        return acc;
      }, {});
    });

    const ws = XLSX.utils.json_to_sheet(rows, { header: HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DQ_WORKFLOW");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="DQ_WORKFLOW_${sheet}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);

  } catch (err) {
    console.error("DQ EXPORT ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});



// =====================================================
// DQ BILLING – BACKEND (FINAL & NORMALIZED)
// =====================================================
app.get("/dq/billing", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }


    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();
      const common = d.common || {};

 
      const billingReady =
        d.billingReady === true ||
        d.billing?.ready === true;

      return {
        repoId: d.repoId || doc.id,
        chemicalProduct: common.chemicalProduct || "",
        manufacturer: common.manufacturer || "",
        billingReady,
      };
    });

    return res.json({
      ok: true,
      rows,
      total: rows.length,
    });
  } catch (err) {
    console.error("DQ BILLING ERROR:", err);
    return res.json({
      ok: false,
      error: err.message,
    });
  }
});



// =====================================================
// USER – LOAD DQ REFERENCES (ASSIGNED WORK) ✅ FIXED
// =====================================================
app.get("/dq/references", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();

    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const references = snap.docs.map(doc => {
      const d = doc.data();

      return {
        referenceId: d.repoId,
        currentStage: d.currentStage || "transcription",
        common: d.common || {},

        
        dq: {
          transcription: {
            data: {
              completedByName: d.completedByName || "",
              dateVerified: d.dateVerified || "",
              issueIdentified: d.issueIdentified || "",
              remarks1: d.remarks1 || "",
              billing: d.billing || "",
            },
          },
        },
      };
    });

    res.json({ ok: true, references });
  } catch (err) {
    console.error("DQ REFERENCES ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});
// =====================================================
// USER – LOAD SINGLE DQ WORKFLOW (FINAL)
// =====================================================
app.get("/user/dq/workflow", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const repoId = String(req.query.repoId || "").trim();
    const userId = String(req.query.userId || "").trim();

    if (!sheet || !repoId || !userId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .where("repoId", "==", repoId)
      .limit(1)
      .get();

    if (snap.empty) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const doc = snap.docs[0];
    const d = doc.data();

    if (d.assignedTo !== userId) {
      return res.json({ ok: false, error: "Access denied" });
    }

    res.json({
      ok: true,
      reference: {
        referenceId: d.repoId,
        currentStage: d.currentStage || "transcription",
        common: d.common || {},

        dq: {
          transcription: {
            data: {
              completedByName: d.completedByName || "",
              dateVerified: d.dateVerified || "",
              issueIdentified: d.issueIdentified || "",
              remarks1: d.remarks1 || "",
              billing: d.billing || "",
            },
          },
        },
      },
    });
  } catch (err) {
    console.error("USER DQ WORKFLOW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});


// =====================================================
// USER – SAVE DQ WORK (TRANSCRIPTION → BILLING)
// =====================================================
app.post("/dq/work", async (req, res) => {
  try {
    const { sheet, repoId, userId, payload } = req.body;

    if (!sheet || !repoId || !userId || !payload) {
      return res.json({ ok: false, error: "Missing data" });
    }

    const sheetId = sheet.toUpperCase();
    const refId = repoId.toUpperCase();

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const d = snap.data();


    if (d.assignedTo !== userId) {
      return res.json({ ok: false, error: "Access denied" });
    }

    await refDoc.update({
      completedByName: userId,
      dateVerified: payload.dateVerified || "",
      issueIdentified: payload.issueIdentified || "",
      remarks1: payload.remarks || "",
      currentStage: "billing",
      billingReady: true,
      updatedAt: Date.now(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("DQ WORK SAVE ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// USER – MY DQ TASKS (FINAL – HIDE COMPLETED)
// =====================================================
app.get("/user/dq-tasks", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();

    if (!userId) {
      return res.json({ ok: false, error: "UserId required" });
    }

    const tasks = [];

    const sheetsSnap = await db.collection("dq_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;

      const refsSnap = await sheetDoc.ref
        .collection("references")
        .get();

      refsSnap.forEach(refDoc => {
        const d = refDoc.data();

      
        if (d.assignedTo !== userId) return;
        if (d.billingReady === true) return; 

        tasks.push({
          sheet: sheetId,
          repoId: d.repoId || refDoc.id,
          status: "assigned",
          assignedTo: d.assignedTo,
          assignedAt: d.assignedAt || d.updatedAt || null,
        });
      });
    }

    return res.json({
      ok: true,
      tasks,
      total: tasks.length,
    });
  } catch (err) {
    console.error("USER DQ TASKS ERROR:", err);
    return res.json({
      ok: false,
      error: "Failed to load user DQ tasks",
    });
  }
});

// =====================================================
// USER – COMPLETED DQ TASKS
// =====================================================
app.get("/user/completed-dq-tasks", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();
    const sheetParam = String(req.query.sheet || "").trim();
    if (!userId) return res.json({ ok: false, error: "UserId required" });

    const tasks = [];
    let assignedCount = 0, pendingCount = 0, completedCount = 0;
    const userSheets = new Set();

    const sheetsSnap = await db.collection("dq_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;
      const refsSnap = await sheetDoc.ref.collection("references").get();

      refsSnap.forEach(refDoc => {
        const d = refDoc.data();
        if (d.assignedTo !== userId) return;

        userSheets.add(sheetId);
        const isCompleted = !!d.billingReady;

        // Summary counts: sheet-filtered
        if (!sheetParam || sheetId === sheetParam) {
          assignedCount++;
          if (isCompleted) completedCount++;
          else pendingCount++;
        }

        // Table rows: completed only, sheet-filtered
        if (!isCompleted) return;
        if (sheetParam && sheetId !== sheetParam) return;

        tasks.push({
          sheet: sheetId,
          repoId: d.repoId || refDoc.id,
          status: "completed",
          assignedTo: d.assignedTo,
          completedAt: d.updatedAt || null,
          dateVerified: d.dateVerified || "",
        });
      });
    }

    tasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    return res.json({
      ok: true,
      tasks,
      total: tasks.length,
      sheets: Array.from(userSheets).sort(),
      summary: { assignedCount, pendingCount, completedCount },
    });
  } catch (err) {
    console.error("COMPLETED DQ TASKS ERROR:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// =====================================================
// USER – LOAD DQ REPO (READ ONLY) ✅ FIXED
// =====================================================
app.get("/dq/load-repos", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    if (!sheet) {
      return res.json({ ok: false, error: "Sheet required" });
    }

    const snap = await db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .orderBy("repoId")
      .get();

    const repos = snap.docs.map(doc => {
      const d = doc.data();
      const c = d.common || {};

      return {
        repoId: d.repoId,
        sdsNumber: c.sdsNumber || "",
        chemicalProduct: c.chemicalProduct || "",
        manufacturer: c.manufacturer || "",
        revisionDate: c.revisionDate || "",
        language: c.language || "",
        sdsStatus: c.sdsStatus || "",
        lastUpdatedDate: c.lastUpdatedDate || "",
        daysInQueue: c.daysInQueue || "",
        sitesInUse: c.sitesInUse || "",
        supersede: c.supersede || "",
      };
    });

    res.json({ ok: true, repos });
  } catch (err) {
    console.error("DQ LOAD REPOS ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// =====================================================
// USER – SUBMIT DQ WORK (FINAL, SINGLE SOURCE)
// =====================================================
app.post("/dq/update", async (req, res) => {
  try {
    const { sheet, repoId, updates } = req.body;

    if (!sheet || !repoId || !updates) {
      return errJson(res, "Missing data", 400);
    }

    const sheetId = normalizeSheetName(sheet);
    const refId = String(repoId).trim().toUpperCase(); 

    const refDoc = db
      .collection("dq_sheets")
      .doc(sheetId)
      .collection("references")
      .doc(refId);

    const snap = await refDoc.get();
    if (!snap.exists) {
      console.log("❌ DQ ref not found:", sheetId, refId);
      return errJson(res, "DQ reference not found", 404);
    }

    await refDoc.set(
      {
        userWork: {
          completedBy: updates.assignedTo,
          dateVerified: updates.dateVerified || "",
          issueIdentified: updates.issueIdentified || "",
          remarks: updates.remarks || "",
        },
        assignedTo: updates.assignedTo,
        currentStage: "billing",
        billingReady: true,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    console.log("✅ DQ updated:", refId);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DQ UPDATE ERROR:", err);
    return errJson(res, err.message);
  }
});
// ======================= DQ SHEETS LIST (REQUIRED FOR DROPDOWN) =======================
app.get("/dq/sheets", async (req, res) => {
  try {
    const snap = await db.collection("dq_sheets").get();
    const sheets = snap.docs.map(doc => doc.id);

    return res.json({
      ok: true,
      sheets
    });
  } catch (err) {
    console.error("DQ SHEETS ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to load DQ sheets"
    });
  }
});

// =====================================================
// ADMIN – VIEW COMPLETED DQ WORK (CLEAN)
// =====================================================
app.get("/admin/dq/view", async (req, res) => {
  try {
    const sheet = String(req.query.sheet || "").trim().toUpperCase();
    const repoId = String(req.query.repoId || "").trim().toUpperCase();

    if (!sheet || !repoId) {
      return res.json({ ok: false, error: "Missing parameters" });
    }

    const docRef = db
      .collection("dq_sheets")
      .doc(sheet)
      .collection("references")
      .doc(repoId);

    const snap = await docRef.get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "DQ reference not found" });
    }

    const d = snap.data();

    res.json({
      ok: true,
      data: {
        repoId: d.repoId,
        common: d.common || {},
        userWork: d.userWork || {},   
      },
    });
  } catch (err) {
    console.error("ADMIN DQ VIEW ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});


const PORT = process.env.PORT || 8080;


const cron = require("node-cron");


cron.schedule("0 9 * * *", async () => {
  console.log("🔔 Running SDS Reminder Job...");

  try {
    const sheetsSnap = await db.collection("sds_sheets").get();

    for (const sheetDoc of sheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref
        .collection("references")
        .where("workflowStatus", "==", "IN_PROGRESS")
        .get();

      for (const doc of refsSnap.docs) {
        const data = doc.data();

        
        if (data.holdUntil && Date.now() > data.holdUntil) {
          console.log(
            `⏰ Reminder: ${data.referenceId} pending with ${data.assignedTo}`
          );

          await doc.ref.set(
            {
              reminder: {
                pending: true,
                lastReminderAt: new Date(),
              },
            },
            { merge: true }
          );
        }
      }
    }

    console.log("✅ Reminder Job Done");
  } catch (err) {
    console.error("❌ Reminder Error:", err);
  }
});

// ---------------- BATCH MODULE ----------------

// ============================================================================
// BATCH UPLOAD
// ============================================================================
function excelDateToJS(value) {
  if (!value) return "";

  if (typeof value === "number") {
    const date = new Date(
      Math.round((value - 25569) * 86400 * 1000)
    );

    return date.toISOString().split("T")[0];
  }

  return value;
}
//batch upload

app.post("/batch/upload", upload.single("file"), async (req, res) => {
  try {
    const sheet = normalize(req.body.sheet);
    const dueDate = String(req.body.dueDate || "").trim();

    if (!sheet || !req.file) {
      return res.json({
        ok: false,
        error: "Sheet and file required",
      });
    }

    if (!dueDate) {
      return res.json({ ok: false, error: "Due date is required" });
    }

    const workbook = XLSX.read(
  req.file.buffer,
  {
    type: "buffer",
    cellStyles: true,
    cellHTML: true,
    cellFormula: true,
  }
);

    const ws =
      workbook.Sheets[workbook.SheetNames[0]];

    const rawRows =
      XLSX.utils.sheet_to_json(ws, {
        defval: "",
      });

    // Trim whitespace from all column headers so "Chemical Name " matches "Chemical Name"
    const rows = rawRows.map(row => {
      const clean = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k.trim()] = v;
      }
      return clean;
    });

    if (!rows.length) {
      return res.json({
        ok: false,
        error: "Empty Excel",
      });
    }
    const repoMap = {};
const duplicateRepos = new Set();

rows.forEach(row => {
  const repo = String(
    row["Repository No."] || row["New Repository"] || ""
  ).trim();

  if (!repo) return;

  repoMap[repo] =
    (repoMap[repo] || 0) + 1;
});

Object.keys(repoMap).forEach(repo => {
  if (repoMap[repo] > 1) {
    duplicateRepos.add(repo);
  }
});

    await db
      .collection("batch_sheets")
      .doc(sheet)
      .set(
        {
          createdAt: Date.now(),
          dueDate,
        },
        { merge: true }
      );

    let batch = db.batch();
let count = 0;
let ops = 0;

    for (let index = 0; index < rows.length; index++) {
  const row = rows[index];
  const repositoryNo = String(
  row["Repository No."] || row["New Repository"] || ""
).trim();

const isDuplicate =
  duplicateRepos.has(
    repositoryNo
  );  

  const excelRow = index + 2;
  const siteSdsCell =
  ws[`F${excelRow}`]; // F = Site SDS # column

const siteSdsLink =
  siteSdsCell?.l?.Target || "";
      const recordId =
        "BATCH_" + String(count + 1).padStart(6, "0");

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      batch.set(ref, {
        duplicate: isDuplicate,

        duplicateGroup:
          repositoryNo,
        recordId,

        common: {
          chemicalName:
            row["Chemical Name"] || "",

          manufacturerName:
            row["Manufacturer Name"] || "",

          revisionDate:
            excelDateToJS(
              row["Revision Date"]
            ),

          siteApprovalStatus:
            row["Site Approval Status"] || "",

          siteName:
            row["Site Name"] || "",

          siteSdsNumber:
            row["Site SDS #"] || "",

          siteSdsLink:
            siteSdsLink,

          manufacturerCountry:
            row["Manufacturer Country"] || "",

          language:
            row["Language"] || "",

          verifiedDate:
            excelDateToJS(
              row["Verified Date"]
            ),

          pdfUploaded:
            row["PDF Uploaded?"] || "",

          pdfQcStatus:
            row["Status (PDF QC Status)"] || "",

          newRepository:
            row["Repository No."] || row["New Repository"] || "",

          productCode:
            row["Product Code"] || "",

          pdfFileName:
            row["PDF File Name"] || "",

          qcCompleteBy:
            row["QC Complete By"] || "",

          searchVerificationAction:
            row["Search Verification Action"] || "",

          emailWebsite:
            row["Email Address / Website"] || row["Email Address/ Website"] || row["Email Address/Website"] || "",

          searchCompletedBy:
            row["Search Completed By"] || "",

          comments:
            row["Comments"] || "",
        },

        verification: {
          status: "pending",
        },

        billing: {
          status: "waiting",
        },

        currentStage: "verification",

        workflowStatus:
          "ASSIGN_PENDING",

        nextStage:
          "verification",

        assignedTo: null,

        uploadedAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      });
      ops++;

if (ops >= 400) {
  await batch.commit();

  batch = db.batch();
  ops = 0;
}

      count++;
    }

    if (ops > 0) {
  await batch.commit();
}

    res.json({
  ok: true,
  count,
  duplicateCount:
    duplicateRepos.size,
});
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

//BATCH SHEETS LIST 

app.get("/batch/sheets", async (req, res) => {
  try {
    const snap =
      await db.collection("batch_sheets").get();

    const sheets =
      snap.docs.map(d => d.id);

    res.json({
      ok: true,
      sheets,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//BATCH RECORDS LIST (FOR ADMIN VIEW)

  app.get("/admin/batch/list", async (req, res) => {
    try {
      const sheet =
        normalize(req.query.sheet);

      if (!sheet) {
        return res.json({
          ok: true,
          rows: [],
        });
      }

      const snap = await db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .get();

      const rows = [];

      snap.forEach(doc => {
        const d = doc.data();
        console.log(
    "DEBUG_LANGUAGE",
    d.recordId,
    d.common?.language
  );

      rows.push({
    recordId: d.recordId,

    newRepository:
      d.common?.newRepository || "",

    chemicalName:
      d.common?.chemicalName || "",

    manufacturerName:
      d.common?.manufacturerName || "",

    revisionDate:
      d.common?.revisionDate || "",

    siteApprovalStatus:
      d.common?.siteApprovalStatus || "",

    siteName:
      d.common?.siteName || "",

    siteSdsNumber:
      d.common?.siteSdsNumber || "",

    siteSdsLink:
      d.common?.siteSdsLink || "",

    manufacturerCountry:
      d.common?.manufacturerCountry || "",

    language:
      d.common?.language || "",

    verifiedDate:
      d.common?.verifiedDate || "",

    pdfUploaded:
      d.common?.pdfUploaded || "",

    pdfQcStatus:
      d.common?.pdfQcStatus || "",

    productCode:
      d.common?.productCode || "",

    pdfFileName:
      d.common?.pdfFileName || "",

    qcCompleteBy:
      d.common?.qcCompleteBy || "",

    searchVerificationAction:
      d.common?.searchVerificationAction || "",

    emailWebsite:
      d.common?.emailWebsite || "",

    searchCompletedBy:
      d.common?.searchCompletedBy || "",

    comments:
      d.common?.comments || "",

    status:
      d.workflowStatus || "ASSIGN_PENDING",

    assignedTo:
      d.verification?.assignedTo || null,

    duplicate:
      d.duplicate || false,

    duplicateGroup:
      d.duplicateGroup || "",
  });
  console.log(
  "LANGUAGE =>",
  d.recordId,
  d.common?.language
);
      });

      res.json({
        ok: true,
        rows,
        total: rows.length,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  });

  //ASSIGN USER TO BATCH RECORD

  app.post("/admin/batch/assign", async (req, res) => {
    try {
      const {
        sheet,
        recordIds,
        userId,
      } = req.body;

      const batch = db.batch();

      for (const id of recordIds) {
        const ref = db
          .collection("batch_sheets")
          .doc(normalize(sheet))
          .collection("records")
          .doc(id);

        batch.set(
          ref,
          {
            workflowStatus:
              "IN_PROGRESS",

            verification: {
              status: "pending",
              assignedTo: userId,
              assignedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }

      await batch.commit();

      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  });

//BATCH LIST DETAILS 

app.get("/batch/details", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const recordId =
      req.query.recordId;

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .doc(recordId)
      .get();

    if (!snap.exists) {
      return res.json({
        ok: false,
      });
    }

    res.json({
      ok: true,
      workflow: snap.data(),
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//SUBMIT VERIFICATION

app.post(
  "/batch/workflow/verification",
  async (req, res) => {
    try {
      const {
        sheet,
        recordId,
        userId,

        dateVerified,
        issueIdentified,

        remarks1,
        remarks2,

        status,
      } = req.body;

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      await ref.set(
        {
          verification: {
            verifiedBy: userId,

            dateVerified,

            issueIdentified,

            remarks1,

            remarks2,

            status,

            completedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          billing: {
            status: "ready",
          },

          currentStage:
            "billing",

          workflowStatus:
            "BILLING_READY",

          nextStage: null,
        },
        { merge: true }
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  }
);

//BILLING QUEUE LIST (FOR BILLING TEAM)

app.get("/admin/batch/billing", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .where(
        "workflowStatus",
        "==",
        "BILLING_READY"
      )
      .get();

    const rows =
      snap.docs.map(d => d.data());

    res.json({
      ok: true,
      rows,
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
    });
  }
});

//BILLING COMPLETE (MARK RECORD AS BILLED)

app.post(
  "/batch/workflow/billing",
  async (req, res) => {
    try {
      const {
        sheet,
        recordId,
        adminId,
      } = req.body;

      const ref = db
        .collection("batch_sheets")
        .doc(sheet)
        .collection("records")
        .doc(recordId);

      await ref.set(
        {
          billing: {
            status: "completed",

            completedBy:
              adminId,

            completedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          },

          workflowStatus:
            "COMPLETED",

          currentStage:
            "completed",
        },
        { merge: true }
      );

      res.json({
        ok: true,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
      });
    }
  }
);

//BATCH EXPORT

app.get("/admin/batch/export", async (req, res) => {
  try {
    const sheet =
      normalize(req.query.sheet);

    const snap = await db
      .collection("batch_sheets")
      .doc(sheet)
      .collection("records")
      .get();

    const rows = snap.docs.map(doc => {
      const d = doc.data();

      return {
        ChemicalName:
          d.common?.chemicalName,

        ManufacturerName:
          d.common?.manufacturerName,

        RevisionDate:
          d.common?.revisionDate,

        SiteName:
          d.common?.siteName,

        SiteSDS:
          d.common?.siteSdsNumber,

        Language:
          d.common?.language,

        Repository:
          d.common?.newRepository,

        ProductCode:
          d.common?.productCode,

        PdfFile:
          d.common?.pdfFileName,

        DateVerified:
          d.verification?.dateVerified,

        IssueIdentified:
          d.verification?.issueIdentified,

        Remarks1:
          d.verification?.remarks1,

        Remarks2:
          d.verification?.remarks2,

        Status:
          d.verification?.status,

        BillingStatus:
          d.billing?.status,
      };
    });

    const wb =
      XLSX.utils.book_new();

    const ws =
      XLSX.utils.json_to_sheet(rows);

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "BATCH_EXPORT"
    );

    const buf =
      XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${sheet}_BATCH.xlsx`
    );

    res.send(buf);
  } catch (err) {
    res.status(500).end();
  }
});

//USER TASKS LIST 
app.get("/user/batch-tasks", async (req, res) => {
  try {
    const userId = String(
      req.query.userId || ""
    )
      .trim()
      .toUpperCase();

    const page =
  Number(req.query.page) || 1;

const pageSize =
  Number(req.query.pageSize) || 100;

const language =
  String(req.query.language || "")
    .trim();

const sheetFilter =
  String(req.query.sheet || "")
    .trim()
    .toUpperCase();

const allTasks = [];
const languageSet = new Set();
const sheetSet = new Set();

    const sheets =
      await db.collection("batch_sheets").get();

    for (const sheetDoc of sheets.docs) {
      const records =
        await sheetDoc.ref
          .collection("records")
          .get();

     records.forEach(doc => {
  const d = doc.data();

  if (
    d.verification?.assignedTo?.toUpperCase() ===
    userId
  ) {
    // Track all sheets this user has tasks in
    sheetSet.add(sheetDoc.id);

    // Collect only this user's languages
    if (d.common?.language) {
      languageSet.add(
        d.common.language
      );
    }
          // Sheet filter
          if (sheetFilter && sheetDoc.id !== sheetFilter) {
            return;
          }

          // Language filter
          if (
            language &&
            d.common?.language !==
              language
          ) {
            return;
          }

          allTasks.push({
            sheet: sheetDoc.id,
            recordId: doc.id,

            newRepository:
              d.common?.newRepository || "",

            chemicalName:
              d.common?.chemicalName || "",
              
            language:
              d.common?.language || "",
              
            duplicate:
              d.duplicate || false,

            status:
              d.verification?.status ||
              "pending",
          });
        }
      });
    }

    // Counts
    const assigned =
      allTasks.length;

    const completed =
      allTasks.filter(
        t =>
          t.status
            ?.toLowerCase() ===
          "completed"
      ).length;

    const pending =
      assigned - completed;
      
    const pendingTasks =
      allTasks.filter(
      t =>
      t.status?.toLowerCase() !==
      "completed"
  );

    // Sort pending first
    allTasks.sort((a, b) => {
      if (
        a.status === "completed" &&
        b.status !== "completed"
      )
        return 1;

      if (
        a.status !== "completed" &&
        b.status === "completed"
      )
        return -1;

      return 0;
    });

    // Pagination
    const start =
      (page - 1) * pageSize;

    const end =
      start + pageSize;

    const tasks =
  pendingTasks.slice(start, end);

    res.json({
      ok: true,

      tasks,
      languages:
        [...languageSet].sort(),

      sheets:
        [...sheetSet].sort(),

      counts: {
        assigned,
        completed,
        pending,
      },

      pagination: {
      page,
      pageSize,
      total: pendingTasks.length,
      pages: Math.ceil(
        pendingTasks.length /
          pageSize
      ),
    },
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      ok: false,
      message:
        "Failed to load tasks",
    });
  }
});

//Batch Completed

app.get("/user/batch/completed", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim().toUpperCase();
    const fromDate = req.query.fromDate || "";
    const toDate = req.query.toDate || "";
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;
    const sheetFilter = String(req.query.sheet || "").trim();

    const rows = [];
    let assignedCount = 0;
    let pendingCount = 0;
    let completedCount = 0;
    const userSheets = new Set();

    const today = new Date().toISOString().slice(0, 10);
    let completedToday = 0;
    let completedMonth = 0;

    const sheets = await db.collection("batch_sheets").get();

    for (const sheetDoc of sheets.docs) {
      const records = await sheetDoc.ref.collection("records").get();

      records.forEach(doc => {
        const d = doc.data();
        if (d.verification?.assignedTo?.toUpperCase() !== userId) return;

        userSheets.add(sheetDoc.id);
        const status = d.verification?.status?.toLowerCase() || "";
        const isCompleted = status === "completed";
        const verifiedDate = d.verification?.dateVerified || "";

        // Summary counts: sheet-filtered, no date filter
        if (!sheetFilter || sheetDoc.id === sheetFilter) {
          assignedCount++;
          if (!isCompleted) pendingCount++;
          else completedCount++;
        }

        // Table rows: sheet-filtered + date-filtered, completed only
        if (!isCompleted) return;
        if (sheetFilter && sheetDoc.id !== sheetFilter) return;
        if (fromDate && verifiedDate < fromDate) return;
        if (toDate && verifiedDate > toDate) return;

        rows.push({
          sheet: sheetDoc.id,
          recordId: doc.id,
          newRepository: d.common?.newRepository || "",
          chemicalName: d.common?.chemicalName,
          manufacturerName: d.common?.manufacturerName,
          language: d.common?.language || "",
          siteName: d.common?.siteName,
          verifiedDate,
        });

        if (verifiedDate === today) completedToday++;
        if (verifiedDate?.startsWith(today.slice(0, 7))) completedMonth++;
      });
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedRows = rows.slice(start, end);

    res.json({
      ok: true,
      rows: paginatedRows,
      sheets: Array.from(userSheets).sort(),
      summary: {
        assignedCount,
        pendingCount,
        completedCount,
        completedToday,
        completedMonth,
        // backward compat
        pendingAssigned: pendingCount,
        totalCompleted: completedCount,
      },
      pagination: {
        page,
        pageSize,
        total: rows.length,
        pages: Math.ceil(rows.length / pageSize),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ================== CHAT / ADMIN ASSISTANT ==================

const chatUpload = multer({ storage: multer.memoryStorage() });

async function callGroq(systemPrompt, userMessage) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 1024,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`Groq: ${data.error.message || JSON.stringify(data.error)}`);
  if (!data.choices?.[0]?.message?.content) throw new Error("Groq returned an empty response");
  return { reply: data.choices[0].message.content, usage: data.usage || null };
}

// Fetch date-filtered activity stats from batch_sheets
async function fetchPeriodStats(fromDate, toDate, userMap) {
  const batchSheetsSnap = await db.collection("batch_sheets").get();
  const sheetData = {};
  const userStats = {};
  let totalAssigned = 0, totalCompleted = 0;

  for (const sheetDoc of batchSheetsSnap.docs) {
    const sheetId = sheetDoc.id;
    const recsSnap = await db.collection("batch_sheets").doc(sheetId).collection("records").get();
    const sheetInfo = { assigned: 0, completed: 0 };

    recsSnap.forEach(doc => {
      const d = doc.data();
      const assignedTo = d.verification?.assignedTo || null;
      const assignedAt = d.verification?.assignedAt?.toDate ? d.verification.assignedAt.toDate() : null;
      const completedAt = d.verification?.completedAt?.toDate ? d.verification.completedAt.toDate() : null;

      if (assignedAt && assignedAt >= fromDate && assignedAt <= toDate) {
        sheetInfo.assigned++; totalAssigned++;
        if (assignedTo) {
          if (!userStats[assignedTo]) userStats[assignedTo] = { name: userMap[assignedTo] || assignedTo, assigned: 0, completed: 0 };
          userStats[assignedTo].assigned++;
        }
      }
      if (completedAt && completedAt >= fromDate && completedAt <= toDate) {
        sheetInfo.completed++; totalCompleted++;
        if (assignedTo) {
          if (!userStats[assignedTo]) userStats[assignedTo] = { name: userMap[assignedTo] || assignedTo, assigned: 0, completed: 0 };
          userStats[assignedTo].completed++;
        }
      }
    });

    if (sheetInfo.assigned > 0 || sheetInfo.completed > 0) sheetData[sheetId] = sheetInfo;
  }

  return {
    totalAssigned, totalCompleted,
    totalPending: Math.max(0, totalAssigned - totalCompleted),
    sheets: sheetData,
    users: Object.entries(userStats)
      .map(([id, s]) => ({ userId: id, ...s, pending: Math.max(0, s.assigned - s.completed) }))
      .sort((a, b) => b.assigned - a.assigned),
  };
}

// Fetch complete live snapshot from Firestore (batch + users)
async function fetchSARNContext() {
  const [batchSheetsSnap, usersSnap] = await Promise.all([
    db.collection("batch_sheets").get(),
    db.collection("users").get(),
  ]);

  const userMap = {};
  const users = [];
  usersSnap.docs.forEach(d => {
    const u = d.data();
    const name = u.name || u.email || d.id;
    userMap[d.id] = name;
    users.push({ id: d.id, name, email: u.email || "", role: u.role || "user" });
  });

  const sheets = {};
  const userStats = {};
  let grandTotal = 0, grandAssigned = 0, grandInProgress = 0, grandBillingReady = 0, grandCompleted = 0, grandUnassigned = 0;

  for (const sheetDoc of batchSheetsSnap.docs) {
    const sheetId = sheetDoc.id;
    const recsSnap = await db.collection("batch_sheets").doc(sheetId).collection("records").get();

    const s = { total: 0, unassigned: 0, inProgress: 0, billingReady: 0, completed: 0 };

    recsSnap.forEach(doc => {
      const d = doc.data();
      const status = d.workflowStatus || "ASSIGN_PENDING";
      const assignedTo = d.verification?.assignedTo || null;
      s.total++;
      grandTotal++;

      if (status === "ASSIGN_PENDING") { s.unassigned++; grandUnassigned++; }
      else if (status === "IN_PROGRESS") { s.inProgress++; grandInProgress++; grandAssigned++; }
      else if (status === "BILLING_READY") { s.billingReady++; grandBillingReady++; grandAssigned++; }
      else if (status === "COMPLETED") { s.completed++; grandCompleted++; grandAssigned++; }

      if (assignedTo && status !== "ASSIGN_PENDING") {
        if (!userStats[assignedTo]) userStats[assignedTo] = { name: userMap[assignedTo] || assignedTo, assigned: 0, inProgress: 0, billingReady: 0, completed: 0 };
        userStats[assignedTo].assigned++;
        if (status === "IN_PROGRESS") userStats[assignedTo].inProgress++;
        if (status === "BILLING_READY") userStats[assignedTo].billingReady++;
        if (status === "COMPLETED") userStats[assignedTo].completed++;
      }
    });

    sheets[sheetId] = s;
  }

  // Add this week's and today's activity stats
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const [todayStats, weekStats] = await Promise.all([
    fetchPeriodStats(todayStart, dayEnd, userMap),
    fetchPeriodStats(weekStart, dayEnd, userMap),
  ]);

  return {
    users,
    batch: {
      currentStatus: { total: grandTotal, assigned: grandAssigned, inProgress: grandInProgress, billingReady: grandBillingReady, completed: grandCompleted, unassigned: grandUnassigned },
      sheets,
      userStats: Object.entries(userStats).map(([id, s]) => ({ userId: id, ...s })).sort((a, b) => b.assigned - a.assigned),
    },
    activityToday: todayStats,
    activityThisWeek: weekStats,
  };
}

// ── IST timestamp helpers ─────────────────────────────────────────────────────
function toIST(ts) {
  if (!ts) return "—";
  let d;
  if (ts && ts.toDate) d = ts.toDate();
  else if (typeof ts === "number") d = new Date(ts);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${ist.getUTCDate()} ${M[ist.getUTCMonth()]} ${String(ist.getUTCHours()).padStart(2,"0")}:${String(ist.getUTCMinutes()).padStart(2,"0")} IST`;
}
function toISTDate(ts) {
  if (!ts) return "—";
  let d;
  if (ts && ts.toDate) d = ts.toDate();
  else if (typeof ts === "number") d = new Date(ts);
  else d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const ist = new Date(d.getTime() + 5.5 * 3600000);
  const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${ist.getUTCDate()} ${M[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
}

// PDF Report Download
app.get("/admin/report/pdf", async (req, res) => {
  try {
    const period = req.query.period || "week";
    const baseUrl = req.headers["x-forwarded-host"]
      ? `${req.headers["x-forwarded-proto"] || "https"}://${req.headers["x-forwarded-host"]}`
      : "https://sarn-backend-862276535294.asia-south1.run.app";
    const now = new Date();
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);
    let fromDate, label;

    if (period === "today") {
      fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0);
      label = `Daily Report — ${now.toDateString()}`;
    } else if (period === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = `Monthly Report — ${now.toLocaleString("default", { month: "long", year: "numeric" })}`;
    } else {
      fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 6); fromDate.setHours(0, 0, 0, 0);
      label = `Weekly Report — ${fromDate.toDateString()} to ${now.toDateString()}`;
    }

    const usersSnap = await db.collection("users").get();
    const userMap = {};
    usersSnap.docs.forEach(d => { const u = d.data(); userMap[d.id] = u.name || u.email || d.id; });

    const data = await fetchPeriodStats(fromDate, dayEnd, userMap);

    // Also get current status snapshot per sheet
    const batchSheetsSnap = await db.collection("batch_sheets").get();
    const sheetTotals = {};
    for (const sheetDoc of batchSheetsSnap.docs) {
      const recsSnap = await db.collection("batch_sheets").doc(sheetDoc.id).collection("records").get();
      sheetTotals[sheetDoc.id] = { total: recsSnap.size };
    }

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=SARN_${period}_report_${now.toISOString().split("T")[0]}.pdf`);
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 612, 80).fill("#1e40af");
    doc.fill("#ffffff").fontSize(22).font("Helvetica-Bold").text("SARN TECHNOLOGIES", 50, 20);
    doc.fontSize(12).font("Helvetica").text(label, 50, 50);
    doc.fill("#000000").moveDown(3);

    // Summary box
    doc.fontSize(14).font("Helvetica-Bold").text("Summary", 50, 100);
    doc.moveTo(50, 118).lineTo(562, 118).lineWidth(1).strokeColor("#1e40af").stroke();
    doc.moveDown(0.5);

    const summaryY = 125;
    const col = (i) => 50 + i * 130;

    doc.roundedRect(col(0), summaryY, 115, 60, 6).fill("#eff6ff");
    doc.roundedRect(col(1), summaryY, 115, 60, 6).fill("#f0fdf4");
    doc.roundedRect(col(2), summaryY, 115, 60, 6).fill("#fff7ed");
    doc.roundedRect(col(3), summaryY, 115, 60, 6).fill("#fef2f2");

    const statBox = (x, y, val, lbl, color) => {
      doc.fill(color).fontSize(22).font("Helvetica-Bold").text(String(val), x + 10, y + 8, { width: 95, align: "center" });
      doc.fill("#6b7280").fontSize(9).font("Helvetica").text(lbl, x + 10, y + 38, { width: 95, align: "center" });
    };
    statBox(col(0), summaryY, data.totalAssigned,  "Assigned",  "#1e40af");
    statBox(col(1), summaryY, data.totalCompleted, "Completed", "#16a34a");
    statBox(col(2), summaryY, data.totalPending,   "Pending",   "#d97706");
    statBox(col(3), summaryY, Object.keys(data.sheets).length, "Active Sheets", "#dc2626");

    doc.fill("#000000").moveDown(6);

    // User Performance Table
    if (data.users.length > 0) {
      const tableTop = summaryY + 80;
      doc.fontSize(14).font("Helvetica-Bold").text("User Performance", 50, tableTop);
      doc.moveTo(50, tableTop + 18).lineTo(562, tableTop + 18).lineWidth(1).strokeColor("#1e40af").stroke();

      // Table header
      const hY = tableTop + 24;
      doc.rect(50, hY, 512, 20).fill("#1e40af");
      doc.fill("#ffffff").fontSize(10).font("Helvetica-Bold");
      doc.text("#",     55,  hY + 5, { width: 25 });
      doc.text("Name",  85,  hY + 5, { width: 180 });
      doc.text("Assigned", 270, hY + 5, { width: 80, align: "center" });
      doc.text("Completed", 355, hY + 5, { width: 80, align: "center" });
      doc.text("Pending",  440, hY + 5, { width: 80, align: "center" });

      let rowY = hY + 22;
      data.users.forEach((u, i) => {
        const bg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(50, rowY, 512, 20).fill(bg);
        doc.fill("#111827").fontSize(10).font("Helvetica");
        doc.text(String(i + 1), 55, rowY + 5, { width: 25 });
        doc.fill("#1d4ed8").text(u.name, 85, rowY + 5, { width: 180, underline: true, link: `${baseUrl}/admin/report/user-detail?userId=${u.userId}&period=${period}` });
        doc.fill("#111827").text(String(u.assigned),  270, rowY + 5, { width: 80, align: "center" });
        doc.text(String(u.completed), 355, rowY + 5, { width: 80, align: "center" });
        doc.text(String(u.pending),   440, rowY + 5, { width: 80, align: "center" });
        rowY += 22;
        if (rowY > 720) { doc.addPage(); rowY = 50; }
      });
      doc.moveDown(2);
    }

    // Sheet Breakdown
    if (Object.keys(data.sheets).length > 0) {
      const sheetY = doc.y + 10;
      doc.fontSize(14).font("Helvetica-Bold").text("Sheet Breakdown", 50, sheetY);
      doc.moveTo(50, sheetY + 18).lineTo(562, sheetY + 18).lineWidth(1).strokeColor("#1e40af").stroke();

      let sY = sheetY + 28;
      Object.entries(data.sheets).forEach(([sheet, s], i) => {
        const bg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
        doc.rect(50, sY, 512, 20).fill(bg);
        doc.fill("#111827").fontSize(10).font("Helvetica");
        doc.text(sheet,               55,  sY + 5, { width: 250 });
        doc.text(`Assigned: ${s.assigned}`,  310, sY + 5, { width: 120 });
        doc.text(`Completed: ${s.completed}`,435, sY + 5, { width: 120 });
        sY += 22;
        if (sY > 720) { doc.addPage(); sY = 50; }
      });
    }

    // Footer
    doc.fontSize(8).fill("#9ca3af").text(
      `Generated by SARN Assistant on ${toIST(Date.now())}`,
      50, 790, { align: "center", width: 512 }
    );

    doc.end();
  } catch (err) {
    console.error("PDF REPORT ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── User Activity Detail PDF ─────────────────────────────────────────────────
app.get("/admin/report/user-detail", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim().toUpperCase();
    const period = req.query.period || "week";
    if (!userId) return res.status(400).json({ ok: false, error: "userId required" });

    // Period boundaries (IST-aware)
    const IST_MS = 5.5 * 3600000;
    const now = new Date();
    const nowIST = new Date(now.getTime() + IST_MS);
    let fromDate, periodLabel;

    if (period === "today") {
      const istMidnight = new Date(nowIST); istMidnight.setUTCHours(0, 0, 0, 0);
      fromDate = new Date(istMidnight.getTime() - IST_MS);
      periodLabel = `Daily Report — ${nowIST.toUTCString().slice(0, 16)}`;
    } else if (period === "month") {
      const istFirst = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), 1));
      fromDate = new Date(istFirst.getTime() - IST_MS);
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      periodLabel = `Monthly Report — ${monthNames[nowIST.getUTCMonth()]} ${nowIST.getUTCFullYear()}`;
    } else {
      const istMidnight = new Date(nowIST); istMidnight.setUTCHours(0, 0, 0, 0);
      const istWeekStart = new Date(istMidnight.getTime() - 6 * 86400000);
      fromDate = new Date(istWeekStart.getTime() - IST_MS);
      periodLabel = `Weekly Report — last 7 days`;
    }
    const dayEnd = new Date(now.getTime() + 86400000); // generous end: tomorrow UTC

    // Get user display name
    const userSnap = await db.collection("users").doc(userId).get();
    const userName = userSnap.exists ? (userSnap.data().name || userId) : userId;

    // ── 1. BATCH records ─────────────────────────────────────────────────────
    const batchRows = [];
    const batchSheetsSnap = await db.collection("batch_sheets").get();
    for (const sheetDoc of batchSheetsSnap.docs) {
      const recsSnap = await sheetDoc.ref.collection("records").get();
      recsSnap.forEach(doc => {
        const d = doc.data();
        const v = d.verification || {};
        if (!v.assignedTo || v.assignedTo.toUpperCase() !== userId) return;
        const assignedAt = v.assignedAt?.toDate ? v.assignedAt.toDate() : null;
        const completedAt = v.completedAt?.toDate ? v.completedAt.toDate() : null;
        const inPeriod = (assignedAt && assignedAt >= fromDate && assignedAt <= dayEnd) ||
                         (completedAt && completedAt >= fromDate && completedAt <= dayEnd);
        if (!inPeriod) return;
        batchRows.push({
          sheet: sheetDoc.id,
          matNumber: d.common?.newRepository || "—",
          chemical: String(d.common?.chemicalName || "—").slice(0, 28),
          assignedAt: assignedAt ? toIST(v.assignedAt) : "—",
          completedAt: completedAt ? toISTDate(v.completedAt) : "—",
          status: v.status === "completed" ? "Done" : "Pending",
        });
      });
    }

    // ── 2. SDS records ────────────────────────────────────────────────────────
    const sdsRows = [];
    const sdsSheetsSnap = await db.collection("sds_sheets").get();
    const SDS_STAGES = ["search", "supersede", "transcription", "billing"];
    for (const sheetDoc of sdsSheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      refsSnap.forEach(doc => {
        const d = doc.data();
        for (const stage of SDS_STAGES) {
          const s = d[stage] || {};
          if (!s.assignedTo || s.assignedTo.toUpperCase() !== userId) continue;
          const assignedAt = s.assignedAt?.toDate ? s.assignedAt.toDate() : null;
          const completedAt = s.completedAt?.toDate ? s.completedAt.toDate() : null;
          const inPeriod = (assignedAt && assignedAt >= fromDate && assignedAt <= dayEnd) ||
                           (completedAt && completedAt >= fromDate && completedAt <= dayEnd);
          if (!inPeriod) continue;
          sdsRows.push({
            sheet: sheetDoc.id,
            refId: String(d.common?.repositoryNumber || d.referenceId || doc.id).slice(0, 18),
            stage: stage.charAt(0).toUpperCase() + stage.slice(1),
            chemical: String(d.common?.chemicalProduct || "—").slice(0, 22),
            assignedAt: assignedAt ? toIST(s.assignedAt) : "—",
            status: s.status === "completed" ? "Done" : "Pending",
          });
        }
      });
    }

    // ── 3. DQ records ─────────────────────────────────────────────────────────
    const dqRows = [];
    const dqSheetsSnap = await db.collection("dq_sheets").get();
    for (const sheetDoc of dqSheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      refsSnap.forEach(doc => {
        const d = doc.data();
        if (!d.assignedTo || d.assignedTo === "__FORCE_BILLED__") return;
        if (d.assignedTo.toUpperCase() !== userId) return;
        const assignedAt = d.assignedAt ? new Date(d.assignedAt) : null;
        const completedAt = d.billingReady && d.updatedAt ? new Date(d.updatedAt) : null;
        const inPeriod = (assignedAt && assignedAt >= fromDate && assignedAt <= dayEnd) ||
                         (completedAt && completedAt >= fromDate && completedAt <= dayEnd);
        if (!inPeriod) return;
        dqRows.push({
          sheet: sheetDoc.id,
          sdsNumber: String(d.repoId || doc.id).slice(0, 18),
          chemical: String(d.common?.chemicalProduct || "—").slice(0, 28),
          assignedAt: assignedAt ? toIST(d.assignedAt) : "—",
          completedAt: completedAt ? toISTDate(d.updatedAt) : "—",
          status: d.billingReady ? "Done" : "In Prog.",
        });
      });
    }

    // ── Generate PDF ──────────────────────────────────────────────────────────
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition",
      `attachment; filename=SARN_${userId}_${period}_${now.toISOString().split("T")[0]}.pdf`);
    doc.pipe(res);

    // Header bar
    doc.rect(0, 0, 612, 78).fill("#1e40af");
    doc.fill("#ffffff").fontSize(19).font("Helvetica-Bold").text("SARN TECHNOLOGIES", 50, 16);
    doc.fontSize(10).font("Helvetica")
       .text(`User Activity Report  •  ${userName}  (${userId})`, 50, 44);
    doc.fill("#000000");

    let curY = 88;
    doc.fontSize(9).fill("#374151").font("Helvetica")
       .text(`${periodLabel}   |   All timestamps in IST   |   Generated: ${toIST(Date.now())}`, 50, curY);
    curY += 18;

    // ── Section renderer ──────────────────────────────────────────────────────
    function renderSection(title, colDefs, rows, emptyMsg) {
      const HDR_H = 20, ROW_H = 18;
      if (curY + 50 > 760) { doc.addPage(); curY = 50; }

      doc.fontSize(12).font("Helvetica-Bold").fill("#1e40af").text(title, 50, curY);
      curY += 16;
      doc.moveTo(50, curY).lineTo(562, curY).lineWidth(0.8).strokeColor("#1e40af").stroke();
      curY += 6;

      if (!rows.length) {
        doc.fontSize(9).font("Helvetica").fill("#6b7280").text(emptyMsg, 55, curY);
        curY += 24;
        return;
      }

      // Column header row
      if (curY + HDR_H > 760) { doc.addPage(); curY = 50; }
      doc.rect(50, curY, 512, HDR_H).fill("#1e3a8a");
      let hx = 50;
      colDefs.forEach(c => {
        doc.fill("#ffffff").fontSize(8.5).font("Helvetica-Bold")
           .text(c.header, hx + 3, curY + 5, { width: c.w - 4, align: c.align || "left", lineBreak: false });
        hx += c.w;
      });
      curY += HDR_H;

      // Data rows
      rows.forEach((row, i) => {
        if (curY + ROW_H > 760) { doc.addPage(); curY = 50; }
        doc.rect(50, curY, 512, ROW_H).fill(i % 2 === 0 ? "#f8fafc" : "#ffffff");
        let rx = 50;
        colDefs.forEach(c => {
          const val = String(row[c.key] || "—");
          let color = "#111827";
          if (c.key === "status") color = val === "Done" ? "#16a34a" : (val === "Pending" ? "#d97706" : "#6b7280");
          doc.fill(color).fontSize(8.5).font("Helvetica")
             .text(val, rx + 3, curY + 4, { width: c.w - 4, align: c.align || "left", lineBreak: false });
          rx += c.w;
        });
        curY += ROW_H;
      });
      curY += 14;
    }

    // BATCH section — columns sum = 512
    renderSection(
      `Batch Verification  (${batchRows.length} record${batchRows.length !== 1 ? "s" : ""})`,
      [
        { header: "Sheet",         key: "sheet",       w: 100 },
        { header: "New Repo #",    key: "matNumber",   w: 100 },
        { header: "Chemical Name", key: "chemical",    w: 110 },
        { header: "Assigned At (IST)",  key: "assignedAt",  w: 127 },
        { header: "Completed",     key: "completedAt", w: 42,  align: "center" },
        { header: "Status",        key: "status",      w: 33,  align: "center" },
      ],
      batchRows,
      "No Batch records found for this period."
    );

    // SDS section — columns sum = 512
    renderSection(
      `SDS Workflow  (${sdsRows.length} record${sdsRows.length !== 1 ? "s" : ""})`,
      [
        { header: "Sheet",         key: "sheet",      w: 85  },
        { header: "Repository #",  key: "refId",      w: 95  },
        { header: "Stage",         key: "stage",      w: 75  },
        { header: "Chemical",      key: "chemical",   w: 115 },
        { header: "Assigned At (IST)", key: "assignedAt", w: 109 },
        { header: "Status",        key: "status",     w: 33, align: "center" },
      ],
      sdsRows,
      "No SDS records found for this period."
    );

    // DQ section — columns sum = 512
    renderSection(
      `DQ Workflow  (${dqRows.length} record${dqRows.length !== 1 ? "s" : ""})`,
      [
        { header: "Sheet",         key: "sheet",       w: 100 },
        { header: "SDS #",         key: "sdsNumber",   w: 100 },
        { header: "Chemical",      key: "chemical",    w: 110 },
        { header: "Assigned At (IST)",  key: "assignedAt",  w: 127 },
        { header: "Completed",     key: "completedAt", w: 42,  align: "center" },
        { header: "Status",        key: "status",      w: 33,  align: "center" },
      ],
      dqRows,
      "No DQ records found for this period."
    );

    // Summary box
    const totalRecs = batchRows.length + sdsRows.length + dqRows.length;
    if (curY + 48 > 760) { doc.addPage(); curY = 50; }
    doc.rect(50, curY, 512, 40).fill("#eff6ff");
    doc.fill("#1e40af").fontSize(11).font("Helvetica-Bold").text("Summary", 60, curY + 6);
    doc.fill("#374151").fontSize(9).font("Helvetica")
       .text(
         `Batch: ${batchRows.length}   |   SDS: ${sdsRows.length}   |   DQ: ${dqRows.length}   |   Total: ${totalRecs} record${totalRecs !== 1 ? "s" : ""}`,
         60, curY + 22
       );

    // Footer
    doc.fontSize(8).fill("#9ca3af").font("Helvetica")
       .text(`SARN Technologies  •  Confidential  •  ${toIST(Date.now())}`, 50, 808, { align: "center", width: 512 });

    doc.end();
  } catch (err) {
    console.error("USER DETAIL PDF ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Google Drive MAT Search ───────────────────────────────────────────────────
const DRIVE_KEY_PATH = require("path").join(__dirname, "sarn-drive-access.json");

async function getDriveClient() {
  const { google } = require("googleapis");
  const key = require(DRIVE_KEY_PATH);
  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    subject: "ramprakash@sarntech.in",
  });
  await auth.authorize();
  return google.drive({ version: "v3", auth });
}

app.get("/admin/drive/search", async (req, res) => {
  try {
    const mat = String(req.query.mat || "").trim().replace(/['"\\]/g, "");
    if (!mat) return res.status(400).json({ ok: false, error: "mat parameter required" });

    const drive = await getDriveClient();
    const response = await drive.files.list({
      q: `name contains '${mat}' and trashed = false`,
      fields: "files(id, name, mimeType, size, modifiedTime, webViewLink)",
      pageSize: 20,
      orderBy: "name",
    });

    const files = (response.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      size: f.size ? Math.round(Number(f.size) / 1024) + " KB" : "—",
      modified: f.modifiedTime ? toISTDate(new Date(f.modifiedTime).getTime()) : "—",
      downloadUrl: `https://sarn-backend-862276535294.asia-south1.run.app/admin/drive/download/${f.id}`,
    }));

    res.json({ ok: true, mat, count: files.length, files });
  } catch (err) {
    console.error("DRIVE SEARCH ERROR:", err.message);
    console.error("DRIVE SEARCH DETAIL:", JSON.stringify(err.response?.data || {}));
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/admin/drive/download/:fileId", async (req, res) => {
  try {
    const { fileId } = req.params;
    const drive = await getDriveClient();

    // Get file metadata for the name
    const meta = await drive.files.get({ fileId, fields: "name, mimeType" });
    const fileName = meta.data.name || fileId;

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", meta.data.mimeType || "application/octet-stream");

    const fileRes = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );
    fileRes.data.pipe(res);
  } catch (err) {
    console.error("DRIVE DOWNLOAD ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Firestore Cross-Collection Search ────────────────────────────────────────
app.get("/admin/firestore/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toUpperCase();
    if (!q || q.length < 3) return res.status(400).json({ ok: false, error: "q must be at least 3 characters" });

    const [batchSnap, sdsSnap, dqSnap] = await Promise.all([
      db.collection("batch_sheets").get(),
      db.collection("sds_sheets").get(),
      db.collection("dq_sheets").get(),
    ]);

    // Batch: search common.newRepository (MAT number)
    const batchResults = [];
    for (const sheetDoc of batchSnap.docs) {
      const recsSnap = await sheetDoc.ref.collection("records").get();
      recsSnap.forEach(doc => {
        const d = doc.data();
        const mat = String(d.common?.newRepository || "").toUpperCase();
        if (!mat || !mat.includes(q)) return;
        batchResults.push({
          type: "Batch",
          sheet: sheetDoc.id,
          id: d.common?.newRepository || doc.id,
          chemical: d.common?.chemicalName || "—",
          status: d.verification?.status || "pending",
          assignedTo: d.verification?.assignedTo || "—",
        });
      });
    }

    // SDS: search common.repositoryNumber or referenceId
    const sdsResults = [];
    for (const sheetDoc of sdsSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      refsSnap.forEach(doc => {
        const d = doc.data();
        const repoNo = String(d.common?.repositoryNumber || d.referenceId || doc.id).toUpperCase();
        if (!repoNo.includes(q)) return;
        const SDS_STAGES = ["search", "supersede", "transcription", "billing"];
        const activeStage = SDS_STAGES.find(s => d[s]?.status === "in_progress" || d[s]?.status === "pending");
        const allDone = SDS_STAGES.every(s => !d[s] || d[s]?.status === "completed");
        sdsResults.push({
          type: "SDS",
          sheet: sheetDoc.id,
          id: d.common?.repositoryNumber || d.referenceId || doc.id,
          chemical: d.common?.chemicalProduct || "—",
          manufacturer: d.common?.manufacturerName || "—",
          stage: activeStage ? activeStage.charAt(0).toUpperCase() + activeStage.slice(1) : (allDone ? "Completed" : "—"),
          detail: {
            businessEntity:    d.common?.businessEntity    || "—",
            repositoryNumber:  d.common?.repositoryNumber  || "—",
            chemicalProduct:   d.common?.chemicalProduct   || "—",
            manufacturerName:  d.common?.manufacturerName  || "—",
            revisionDate:      d.common?.revisionDate      || "—",
            verificationDate:  d.common?.verificationDate  || "—",
            search: {
              status:       d.search?.status       || "—",
              assignedTo:   d.search?.assignedTo   || "—",
              websearch1:   d.search?.websearch1   || "—",
              websearch2:   d.search?.websearch2   || "—",
              startDate:    d.search?.startDate    || "—",
              endDate:      d.search?.endDate      || "—",
              remarks:      d.search?.remarks      || "—",
              notPublishable: d.search?.notPublishable ? "Yes" : "No",
              notPublishableRemarks: d.search?.notPublishableRemarks || "—",
            },
            supersede: {
              status:               d.supersede?.status               || "—",
              assignedTo:           d.supersede?.assignedTo           || "—",
              newRepositoryNumber:  d.supersede?.newRepositoryNumber  || "—",
              supersedeDate:        d.supersede?.supersedeDate        || "—",
              verifiedDate:         d.supersede?.verifiedDate         || "—",
              remarks:              d.supersede?.remarks              || "—",
            },
            transcription: {
              status:       d.transcription?.status       || "—",
              assignedTo:   d.transcription?.assignedTo   || "—",
              verifiedDate: d.transcription?.verifiedDate || "—",
              remarks:      d.transcription?.remarks      || "—",
            },
            billing: {
              status:     d.billing?.status     || "—",
              assignedTo: d.billing?.assignedTo || "—",
            },
          },
        });
      });
    }

    // DQ: search repoId
    const dqResults = [];
    for (const sheetDoc of dqSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      refsSnap.forEach(doc => {
        const d = doc.data();
        const repoId = String(d.repoId || doc.id).toUpperCase();
        if (!repoId.includes(q)) return;
        dqResults.push({
          type: "DQ",
          sheet: sheetDoc.id,
          id: d.repoId || doc.id,
          chemical: d.common?.chemicalProduct || "—",
          manufacturer: d.common?.manufacturer || "—",
          status: d.billingReady ? "Billing Ready" : (d.status || "Pending"),
          assignedTo: d.assignedTo || "—",
        });
      });
    }

    res.json({
      ok: true,
      q,
      total: batchResults.length + sdsResults.length + dqResults.length,
      batch: batchResults,
      sds: sdsResults,
      dq: dqResults,
    });
  } catch (err) {
    console.error("FIRESTORE SEARCH ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Super Admin Executive Summary PDF ────────────────────────────────────────
app.get("/admin/report/superadmin-pdf", async (req, res) => {
  try {
    const period = req.query.period || "week";
    const now    = new Date();
    const toDate = new Date(now); toDate.setHours(23, 59, 59, 999);
    let fromDate = null, periodLabel;

    if (period === "today") {
      fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0);
      periodLabel = `Daily Summary — ${now.toDateString()}`;
    } else if (period === "month") {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const MN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      periodLabel = `Monthly Summary — ${MN[now.getMonth()]} ${now.getFullYear()}`;
    } else {
      fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 6); fromDate.setHours(0, 0, 0, 0);
      periodLabel = "Weekly Summary — Last 7 Days";
    }

    // user name lookup
    const usersSnap = await db.collection("users").get();
    const nameMap = {};
    usersSnap.forEach(d => { nameMap[d.id] = d.data().name || d.data().email || d.id; });

    // ── Per (user × business) stats ──────────────────────────────────────────
    // Key: `uid|||sheetId` — one entry per unique user+business combination.
    // This gives one PDF row per user per business with exact counts for that pair.
    const ubStats = {};
    function getUbs(uid, sheetId) {
      const k = `${uid}|||${sheetId}`;
      if (!ubStats[k]) ubStats[k] = {
        uid, sheetId,
        searchE:0, searchML:0, supersedeE:0, supersedeML:0,
        transcriptionE:0, transcriptionML:0, billingE:0, billingML:0,
        dqAssigned:0, dqCompleted:0,
        batchAssigned:0, batchCompleted:0,
      };
      return ubStats[k];
    }

    const SDS_STAGES = ["search", "supersede", "transcription", "billing"];

    // ── SDS ──────────────────────────────────────────────────────────────────
    const sdsSheetsSnap = await db.collection("sds_sheets").get();
    for (const sheetDoc of sdsSheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      for (const recDoc of refsSnap.docs) {
        const d = recDoc.data();
        const rawLang = String(d.common?.language || d.search?.language || "english").toLowerCase().trim();
        const suffix  = (!rawLang || rawLang === "english") ? "E" : "ML";
        for (const stage of SDS_STAGES) {
          const s = d[stage];
          if (!s || !s.assignedTo) continue;
          const completedAt = s.completedAt?.toDate ? s.completedAt.toDate() : null;
          if (!completedAt) continue;
          if (fromDate && (completedAt < fromDate || completedAt > toDate)) continue;
          getUbs(s.assignedTo, sheetDoc.id)[`${stage}${suffix}`]++;
        }
      }
    }

    // ── DQ ───────────────────────────────────────────────────────────────────
    const dqSheetsSnap = await db.collection("dq_sheets").get();
    for (const sheetDoc of dqSheetsSnap.docs) {
      const refsSnap = await sheetDoc.ref.collection("references").get();
      for (const recDoc of refsSnap.docs) {
        const d = recDoc.data();
        const uid = d.assignedTo; if (!uid) continue;
        const aAt  = d.assignedAt ? new Date(d.assignedAt) : null;
        const uAt  = d.updatedAt  ? new Date(d.updatedAt)  : null;
        const done = d.billingReady === true;
        const inC  = done && (!fromDate || (uAt && uAt >= fromDate && uAt <= toDate));
        const inA  = !fromDate || (aAt && aAt >= fromDate && aAt <= toDate) || inC;
        if (!inA && !inC) continue;
        const u = getUbs(uid, sheetDoc.id);
        if (inA) u.dqAssigned++;
        if (inC) u.dqCompleted++;
      }
    }

    // ── Batch ─────────────────────────────────────────────────────────────────
    const batchSheetsSnap = await db.collection("batch_sheets").get();
    for (const sheetDoc of batchSheetsSnap.docs) {
      const recsSnap = await sheetDoc.ref.collection("records").get();
      for (const recDoc of recsSnap.docs) {
        const d   = recDoc.data();
        const uid = d.verification?.assignedTo; if (!uid) continue;
        const aAt = d.verification?.assignedAt?.toDate ? d.verification.assignedAt.toDate() : null;
        const cAt = d.verification?.completedAt?.toDate ? d.verification.completedAt.toDate() : null;
        const done = d.verification?.status === "Completed";
        const inC  = done && (!fromDate || (cAt && cAt >= fromDate && cAt <= toDate));
        const inA  = !fromDate || (aAt && aAt >= fromDate && aAt <= toDate) || inC;
        if (!inA && !inC) continue;
        const u = getUbs(uid, sheetDoc.id);
        if (inA) u.batchAssigned++;
        if (inC) u.batchCompleted++;
      }
    }

    // ── Derive totals from ubStats ────────────────────────────────────────────
    const allUbs = Object.values(ubStats);
    const sdsT = { searchE:0, searchML:0, supersedeE:0, supersedeML:0, transcriptionE:0, transcriptionML:0, billingE:0, billingML:0 };
    allUbs.forEach(u => { Object.keys(sdsT).forEach(k => { sdsT[k] += (u[k]||0); }); });
    const sdsTotE   = sdsT.searchE + sdsT.supersedeE + sdsT.transcriptionE + sdsT.billingE;
    const sdsTotML  = sdsT.searchML + sdsT.supersedeML + sdsT.transcriptionML + sdsT.billingML;
    const sdsTot    = sdsTotE + sdsTotML;
    const dqTotA    = allUbs.reduce((a,u) => a + (u.dqAssigned||0),    0);
    const dqTotC    = allUbs.reduce((a,u) => a + (u.dqCompleted||0),   0);
    const btTotA    = allUbs.reduce((a,u) => a + (u.batchAssigned||0), 0);
    const btTotC    = allUbs.reduce((a,u) => a + (u.batchCompleted||0),0);
    const grandTotal = sdsTot + dqTotC + btTotC;

    // ── User × Business rows — one row per (user, business) pair ─────────────
    const userRows = allUbs.map(u => {
      const srch  = u.searchE       + u.searchML;
      const supr  = u.supersedeE    + u.supersedeML;
      const tran  = u.transcriptionE + u.transcriptionML;
      const bill  = u.billingE      + u.billingML;
      const total = srch + supr + tran + bill + u.dqCompleted + u.batchCompleted;
      if (!total) return null;
      return {
        name:  nameMap[u.uid] || u.uid,
        biz:   u.sheetId.replace(/_/g, " "),
        srch, supr, tran, bill,
        dq:    u.dqCompleted,
        batch: u.batchCompleted,
        total,
      };
    }).filter(Boolean).sort((a,b) => b.total - a.total || a.name.localeCompare(b.name));

    // ── Business-wise rows — derived from ubStats (no double-counting) ────────
    const bizMap = {};
    allUbs.forEach(u => {
      const sid = u.sheetId;
      if (!bizMap[sid]) bizMap[sid] = { types: new Set(), assigned:0, completed:0 };
      const sdsC = u.searchE+u.searchML+u.supersedeE+u.supersedeML+u.transcriptionE+u.transcriptionML+u.billingE+u.billingML;
      if (sdsC) { bizMap[sid].types.add("SDS"); bizMap[sid].completed += sdsC; }
      if (u.dqAssigned)   { bizMap[sid].types.add("DQ");    bizMap[sid].assigned  += u.dqAssigned;    bizMap[sid].completed += u.dqCompleted; }
      if (u.batchAssigned){ bizMap[sid].types.add("Batch"); bizMap[sid].assigned  += u.batchAssigned; bizMap[sid].completed += u.batchCompleted; }
    });
    const bizRows = Object.entries(bizMap)
      .map(([sh,v]) => ({ name: sh.replace(/_/g," "), type: [...v.types].join("/"), assigned: v.assigned, completed: v.completed }))
      .sort((a,b) => b.completed - a.completed);

    // ── PDF ───────────────────────────────────────────────────────────────────
    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin:40, size:"A4" });
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",`attachment; filename=SARN_Executive_${period}_${now.toISOString().split("T")[0]}.pdf`);
    doc.pipe(res);

    // A4 = 595pt wide. L=40, R=555, usable W=515
    const L = 40, W = 515;
    let Y = 0;

    function guard(h=20) { if (Y + h > 768) { doc.addPage(); Y = 50; } }

    // ── Header ──────────────────────────────────────────────────────────────
    doc.rect(0, 0, 595, 70).fill("#0f172a");
    doc.fill("#ffffff").fontSize(17).font("Helvetica-Bold").text("SARN TECHNOLOGIES", L, 12, {width:W, lineBreak:false});
    doc.fontSize(10).font("Helvetica").text("Executive Summary Report  ·  " + periodLabel, L, 34, {width:W, lineBreak:false});
    doc.fontSize(8).fill("#93c5fd").text(`Generated: ${toISTDate(Date.now())}  ·  Confidential`, L, 52, {width:W, lineBreak:false});
    doc.fill("#000000");
    Y = 82;

    // ── Summary boxes ────────────────────────────────────────────────────────
    guard(62);
    const bw = (W - 9) / 4;
    [
      { lbl:"SDS Completed",   val:sdsTot,    col:"#1d4ed8", bg:"#dbeafe" },
      { lbl:"DQ Completed",    val:dqTotC,    col:"#7c3aed", bg:"#ede9fe" },
      { lbl:"Batch Completed", val:btTotC,    col:"#0891b2", bg:"#cffafe" },
      { lbl:"Grand Total",     val:grandTotal, col:"#15803d", bg:"#dcfce7" },
    ].forEach((b,i) => {
      const bx = L + i*(bw+3);
      doc.roundedRect(bx, Y, bw, 56, 5).fill(b.bg);
      doc.fill(b.col).fontSize(22).font("Helvetica-Bold").text(String(b.val), bx+4, Y+6, {width:bw-8, align:"center", lineBreak:false});
      doc.fill("#374151").fontSize(8.5).font("Helvetica").text(b.lbl, bx+4, Y+36, {width:bw-8, align:"center", lineBreak:false});
    });
    Y += 64;

    function secTitle(title) {
      guard(24);
      doc.rect(L, Y, W, 20).fill("#0f172a");
      doc.fill("#ffffff").fontSize(9.5).font("Helvetica-Bold").text(title, L+6, Y+5, {width:W-10, lineBreak:false});
      Y += 20;
    }

    // ── SDS Stage Breakdown ─────────────────────────────────────────────────
    // Stage(140) + English(125) + Multilingual(125) + Total(125) = 515
    Y += 6;
    secTitle("SDS WORKFLOW — STAGE BREAKDOWN");
    const SC = [{v:"Stage",w:140,a:"left"},{v:"English",w:125,a:"center"},{v:"Multilingual",w:125,a:"center"},{v:"Total",w:125,a:"center"}];
    guard(22); doc.rect(L,Y,W,22).fill("#1e293b"); let hx=L;
    SC.forEach(c => { doc.fill("#e2e8f0").fontSize(8.5).font("Helvetica-Bold").text(c.v,hx+4,Y+6,{width:c.w-6,align:c.a,lineBreak:false}); hx+=c.w; }); Y+=22;
    [["Search",       sdsT.searchE,        sdsT.searchML],
     ["Supersede",    sdsT.supersedeE,     sdsT.supersedeML],
     ["Transcription",sdsT.transcriptionE, sdsT.transcriptionML],
     ["Billing",      sdsT.billingE,       sdsT.billingML]]
      .forEach(([lbl,e,ml],i) => {
        guard(18); doc.rect(L,Y,W,18).fill(i%2===0?"#f8fafc":"#ffffff");
        let rx=L;
        [[lbl,140,"left"],[e,125,"center"],[ml,125,"center"],[e+ml,125,"center"]].forEach(([v,cw,a]) => {
          doc.fill("#111827").fontSize(8.5).font("Helvetica").text(String(v),rx+4,Y+4,{width:cw-6,align:a,lineBreak:false}); rx+=cw;
        }); Y+=18;
      });
    guard(22); doc.rect(L,Y,W,22).fill("#dbeafe"); let tr=L;
    [["TOTAL",140,"left"],[sdsTotE,125,"center"],[sdsTotML,125,"center"],[sdsTot,125,"center"]].forEach(([v,cw,a]) => {
      doc.fill("#1d4ed8").fontSize(9).font("Helvetica-Bold").text(String(v),tr+4,Y+5,{width:cw-6,align:a,lineBreak:false}); tr+=cw;
    }); Y+=26;

    // ── DQ + Batch inline cards ───────────────────────────────────────────────
    guard(38);
    const hw = (W-6)/2;
    doc.roundedRect(L,Y,hw,34,4).fill("#f5f3ff");
    doc.fill("#7c3aed").fontSize(9).font("Helvetica-Bold").text("DQ WORKFLOW",L+8,Y+5,{width:hw-12,lineBreak:false});
    doc.fill("#374151").fontSize(8).font("Helvetica").text(`Assigned: ${dqTotA}   Completed: ${dqTotC}   Pending: ${Math.max(0,dqTotA-dqTotC)}`,L+8,Y+20,{width:hw-12,lineBreak:false});
    const bx2=L+hw+6;
    doc.roundedRect(bx2,Y,hw,34,4).fill("#f0fdfa");
    doc.fill("#0891b2").fontSize(9).font("Helvetica-Bold").text("BATCH WORKFLOW",bx2+8,Y+5,{width:hw-12,lineBreak:false});
    doc.fill("#374151").fontSize(8).font("Helvetica").text(`Assigned: ${btTotA}   Completed: ${btTotC}   Pending: ${Math.max(0,btTotA-btTotC)}`,bx2+8,Y+20,{width:hw-12,lineBreak:false});
    Y += 42;

    // ── User × Business Performance ───────────────────────────────────────────
    // One row per user per business. Columns sum = 515:
    // #(20) Name(95) Business(105) SDS Srch(44) SDS Supr(44) SDS Trans(44) SDS Bill(44) DQ(34) Batch(34) Total(51) = 515
    Y += 4;
    secTitle("USER-WISE PERFORMANCE BY BUSINESS  (Completed counts)");
    const UC = [
      {v:"#",        w:20,  a:"center"},
      {v:"Name",     w:95,  a:"left"},
      {v:"Business", w:105, a:"left"},
      {v:"SDS Srch", w:44,  a:"center"},
      {v:"SDS Supr", w:44,  a:"center"},
      {v:"SDS Trans",w:44,  a:"center"},
      {v:"SDS Bill", w:44,  a:"center"},
      {v:"DQ",       w:34,  a:"center"},
      {v:"Batch",    w:34,  a:"center"},
      {v:"Total",    w:51,  a:"center"},
    ];
    guard(22); doc.rect(L,Y,W,22).fill("#1e293b"); let uhx=L;
    UC.forEach(c => { doc.fill("#e2e8f0").fontSize(8).font("Helvetica-Bold").text(c.v,uhx+3,Y+6,{width:c.w-4,align:c.a,lineBreak:false}); uhx+=c.w; }); Y+=22;
    if (!userRows.length) {
      guard(18); doc.fill("#6b7280").fontSize(9).font("Helvetica").text("No completed activity in this period.",L+6,Y+4); Y+=18;
    }
    userRows.forEach((u,i) => {
      guard(18); doc.rect(L,Y,W,18).fill(i%2===0?"#f8fafc":"#ffffff");
      let urx=L;
      const cells = [
        {v:i+1,   w:20,  a:"center"},
        {v:u.name,w:95,  a:"left"},
        {v:u.biz, w:105, a:"left"},
        {v:u.srch||0, w:44, a:"center"},
        {v:u.supr||0, w:44, a:"center"},
        {v:u.tran||0, w:44, a:"center"},
        {v:u.bill||0, w:44, a:"center"},
        {v:u.dq||0,   w:34, a:"center"},
        {v:u.batch||0,w:34, a:"center"},
        {v:u.total,   w:51, a:"center", bold:true},
      ];
      cells.forEach(c => {
        doc.fill(c.bold?"#1d4ed8":"#111827").fontSize(8).font(c.bold?"Helvetica-Bold":"Helvetica")
           .text(String(c.v??"—"),urx+3,Y+4,{width:c.w-4,align:c.a,lineBreak:false});
        urx += c.w;
      }); Y+=18;
    });

    // ── Business-wise Activity ───────────────────────────────────────────────
    // #(22) Business(213) Type(80) Assigned(80) Completed(120) = 515
    Y += 6;
    secTitle("BUSINESS-WISE ACTIVITY");
    const BC = [
      {v:"#",         w:22,  a:"center"},
      {v:"Business",  w:213, a:"left"},
      {v:"Type",      w:80,  a:"center"},
      {v:"Assigned",  w:80,  a:"center"},
      {v:"Completed", w:120, a:"center"},
    ];
    guard(22); doc.rect(L,Y,W,22).fill("#1e293b"); let bhx=L;
    BC.forEach(c => { doc.fill("#e2e8f0").fontSize(8.5).font("Helvetica-Bold").text(c.v,bhx+3,Y+6,{width:c.w-4,align:c.a,lineBreak:false}); bhx+=c.w; }); Y+=22;
    if (!bizRows.length) {
      guard(18); doc.fill("#6b7280").fontSize(9).font("Helvetica").text("No business activity in this period.",L+6,Y+4); Y+=18;
    }
    bizRows.forEach((b,i) => {
      guard(18); doc.rect(L,Y,W,18).fill(i%2===0?"#f8fafc":"#ffffff"); let brx=L;
      [{v:i+1,     w:22,  a:"center"},
       {v:b.name,  w:213, a:"left"},
       {v:b.type,  w:80,  a:"center"},
       {v:b.assigned,  w:80,  a:"center"},
       {v:b.completed, w:120, a:"center"},
      ].forEach(c => { doc.fill("#111827").fontSize(8).font("Helvetica").text(String(c.v??"—"),brx+3,Y+4,{width:c.w-4,align:c.a,lineBreak:false}); brx+=c.w; }); Y+=18;
    });

    // Footer
    doc.fontSize(7.5).fill("#9ca3af").font("Helvetica")
       .text(`SARN Technologies  ·  Executive Summary  ·  Confidential  ·  ${toISTDate(Date.now())}`, L, 828, {align:"center", width:W});

    doc.end();
  } catch (err) {
    console.error("SUPER ADMIN PDF ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Split raw PDF text into SDS sections (works for English, Spanish, etc.)
function splitPdfSections(text) {
  // Matches: "SECTION 1:", "Section 1 -", "SECCIÓN 1.", "1. IDENTIFICATION", "1 - PRODUCT"
  const headerRe = /(?:^|\n)[ \t]*(?:(?:SECCI[ÓO]N|SECTION|Section|ABSCHNITT|RUBRIQUE)\s+(\d{1,2})\b[^\n]*|(\d{1,2})[ \t]*[\.\-–][ \t]*[A-ZÁÉÍÓÚÑÜA-Z][^\n]{4,})/gm;

  const matches = [];
  let m;
  while ((m = headerRe.exec(text)) !== null) {
    const num = parseInt(m[1] || m[2]);
    if (!isNaN(num) && num >= 1 && num <= 20) {
      matches.push({ index: m.index, header: m[0].trim(), num });
    }
  }

  if (matches.length < 2) {
    // Fallback: split into ~1500-char labelled chunks
    const CHUNK = 1500;
    const sections = [];
    for (let i = 0; i < text.length && sections.length < 16; i += CHUNK) {
      sections.push({ number: sections.length + 1, title: `Part ${sections.length + 1}`, text: text.slice(i, i + CHUNK) });
    }
    return sections;
  }

  return matches.slice(0, 20).map((match, i) => {
    const start = match.index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(start, end).trim().slice(0, 2000);
    const titleClean = match.header
      .replace(/^[ \t]*/, "")
      .replace(/^(?:SECCI[ÓO]N|SECTION|Section|ABSCHNITT)\s*\d+\s*[:\-–]?\s*/i, "")
      .replace(/^\d+\s*[\.\-–:]\s*/, "")
      .trim() || `Section ${match.num}`;
    return { number: match.num, title: titleClean, text: body };
  });
}

app.post("/admin/pdf/translate-section", async (req, res) => {
  try {
    const { lines } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0)
      return res.status(400).json({ ok: false, error: "lines array required" });

    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    // Collect non-blank lines with their original indices
    const indexed = lines
      .map((l, i) => ({ i, text: (l || "").trim() }))
      .filter(x => x.text);

    if (indexed.length === 0)
      return res.json({ ok: true, translatedLines: lines, usage: null });

    const numbered = indexed.map((x, n) => `${n + 1}. ${x.text}`).join("\n");

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 2400,
        messages: [
          {
            role: "system",
            content: `You are a professional technical translator for chemical Safety Data Sheets (SDS/MSDS) following GHS and OSHA standards.

You will receive a numbered list of lines. Translate each line to English.

Rules:
- Return EXACTLY ${indexed.length} numbered lines in the same order (1. 2. 3. …)
- Do NOT add, remove, merge, or split any lines — one input line = one output line
- Preserve all numbers, CAS numbers, percentages, units, and codes exactly as written
- Use correct GHS/OSHA SDS terminology
- Output ONLY the numbered translated lines — no preamble, notes, or explanation`,
          },
          { role: "user", content: numbered },
        ],
      }),
    });

    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    if (!raw) return res.json({ ok: false, error: "Translation returned empty." });

    // Parse "N. text" lines from the response
    const parsed = [];
    for (const line of raw.split("\n")) {
      const m = line.match(/^\d+\.\s*(.*)/);
      if (m) parsed.push(m[1].trim());
    }

    // Reconstruct the full array restoring blank lines at original positions
    const translatedLines = lines.map((l, i) => {
      if (!(l || "").trim()) return "";
      const idx = indexed.findIndex(x => x.i === i);
      return idx >= 0 ? (parsed[idx] || l) : l;
    });

    res.json({ ok: true, translatedLines, usage: data.usage || null });
  } catch (err) {
    console.error("SECTION TRANSLATE ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/admin/pdf/translate", async (req, res) => {
  try {
    const { fields } = req.body;
    if (!fields) return res.status(400).json({ ok: false, error: "fields required" });
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: "Translate all non-null string values in this SDS header JSON to English. Use correct IUPAC chemical names and standard SDS terminology. Keep the exact same JSON keys. Return ONLY valid JSON, no markdown, no explanation.",
          },
          { role: "user", content: JSON.stringify(fields) },
        ],
      }),
    });
    const data = await groqRes.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
    let translated = {};
    try {
      const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      translated = JSON.parse(jsonStr);
    } catch {
      return res.json({ ok: false, error: "Translation parsing failed." });
    }
    res.json({ ok: true, fields: translated, usage: data.usage || null });
  } catch (err) {
    console.error("TRANSLATE ERROR:", err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post("/admin/chat", chatUpload.single("pdf"), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) return res.json({ ok: false, error: "Groq API key not configured" });

    const { message } = req.body;

    // ---- PDF field extraction ----
    if (req.file) {
      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
      const _path = require("path");
      const cMapUrl = _path.join(_path.dirname(require.resolve("pdfjs-dist/package.json")), "cmaps") + _path.sep;
      let rawText = "";
      try {
        const uint8Array = new Uint8Array(req.file.buffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array, cMapUrl, cMapPacked: true, useSystemFonts: true });
        const pdfDoc = await loadingTask.promise;
        for (let pg = 1; pg <= pdfDoc.numPages; pg++) {
          const page = await pdfDoc.getPage(pg);
          const content = await page.getTextContent();
          rawText += content.items.map(item => item.str).join(" ") + "\n";
        }
        rawText = rawText.replace(/\r\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
      } catch (e) {
        return res.json({ ok: false, error: "Could not extract text from PDF." });
      }
      if (!rawText) return res.json({ ok: false, error: "Could not extract text from PDF." });

      // Only first 2000 chars — all header fields appear near the top of SDS sheets
      const snippet = rawText.slice(0, 2000);

      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0,
          max_tokens: 300,
          messages: [
            {
              role: "system",
              content: "Extract ONLY these 6 fields from the SDS document text. Return ONLY valid JSON with these exact keys: businessEntity, repositoryNumber, chemicalProduct, manufacturer, revisionDate, verificationDate. Use null for any field not found. No markdown, no explanation — raw JSON only.",
            },
            { role: "user", content: snippet },
          ],
        }),
      });
      const groqData = await groqRes.json();
      const raw = groqData.choices?.[0]?.message?.content?.trim() || "{}";

      let fields = {};
      try {
        const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
        fields = JSON.parse(jsonStr);
      } catch {
        return res.json({ ok: false, error: "Could not parse fields from PDF. Try a clearer scan." });
      }

      const sections = splitPdfSections(rawText);
      return res.json({ ok: true, type: "pdf_extract", pdfFields: fields, sections, usage: groqData.usage || null });
    }

    // ---- Admin assistant ----
    if (message) {
      const m = message.toLowerCase();

      // Help — no Firestore or LLM needed
      if (m.match(/help|what can you|how do i|what do you do/)) {
        return res.json({ ok: true, reply:
          `Here's what I can help you with:\n\n` +
          `📊 "Tell me the batch report of [sheet name]"\n` +
          `📋 "How many records are pending in [sheet]?"\n` +
          `✅ "Who has completed the most records?"\n` +
          `⚠️ "Which users have no records assigned?"\n` +
          `📄 "List all batch sheets"\n` +
          `👥 "List all users"\n` +
          `🔍 "Give me an overview of all data"\n\n` +
          `Just ask naturally — I have full access to all batch sheets, records, and users.`
        });
      }

      // List sheets — no LLM needed
      if (m.match(/list.*sheet|all sheet|which sheet|available sheet|show.*sheet/)) {
        const snap = await db.collection("batch_sheets").get();
        if (snap.empty) return res.json({ ok: true, reply: "No batch sheets found." });
        return res.json({ ok: true, reply: `📄 Batch Sheets (${snap.size}):\n\n${snap.docs.map(d => `• ${d.id}`).join("\n")}` });
      }

      // List users — no LLM needed
      if (m.match(/list.*user|all user|show.*user|who.*on the team|staff/)) {
        const snap = await db.collection("users").get();
        if (snap.empty) return res.json({ ok: true, reply: "No users found." });
        const lines = snap.docs.map(d => { const u = d.data(); return `• ${u.name || "—"} (${u.email || d.id}) — ${u.role || "user"}`; }).join("\n");
        return res.json({ ok: true, reply: `👥 Users (${snap.size}):\n\n${lines}` });
      }

      // All other questions — fetch full live data and let LLM answer
      console.log("Fetching SARN context for chat...");
      const context = await fetchSARNContext();

      const systemPrompt = `You are SARN Admin Assistant with full access to live data from the SARN system.

SARN manages batch SDS (Safety Data Sheet) records. Each record goes through stages:
- ASSIGN_PENDING: not yet assigned to any user
- IN_PROGRESS: assigned to a user, currently being verified
- BILLING_READY: verification complete, waiting for billing
- COMPLETED: fully done

Answer the admin's question using ONLY the data provided below. Be specific, accurate, and concise.
Format numbers clearly. If asked about a specific sheet, find it in the data and report exactly.

LIVE DATA SNAPSHOT:
${JSON.stringify(context, null, 2)}`;

      const { reply, usage } = await callGroq(systemPrompt, message);
      return res.json({ ok: true, reply, usage });
    }

    return res.json({ ok: false, error: "Send a message or upload a PDF" });
  } catch (err) {
    console.error("CHAT ERROR:", err.message);
    res.json({ ok: false, error: err.message || "Something went wrong. Please try again." });
  }
});

// =====================================================================
// SDS SCANNER — Full 14-field template extraction via Groq
// =====================================================================
app.post("/admin/sds/scan", chatUpload.single("pdf"), async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) return res.json({ ok: false, error: "Groq API key not configured" });
    if (!req.file) return res.json({ ok: false, error: "No PDF file received" });

    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf");
    const _path    = require("path");
    const cMapUrl  = _path.join(_path.dirname(require.resolve("pdfjs-dist/package.json")), "cmaps") + _path.sep;

    let rawText = "";
    try {
      const uint8 = new Uint8Array(req.file.buffer);
      const doc   = await pdfjsLib.getDocument({ data: uint8, cMapUrl, cMapPacked: true, useSystemFonts: true }).promise;
      for (let pg = 1; pg <= doc.numPages; pg++) {
        const page    = await doc.getPage(pg);
        const content = await page.getTextContent();
        rawText += content.items.map(i => i.str).join(" ") + "\n";
      }
      rawText = rawText.replace(/\r\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
    } catch {
      return res.json({ ok: false, error: "Could not extract text from PDF." });
    }

    if (rawText.length < 200) {
      return res.json({ ok: false, isScanned: true, error: "This appears to be a scanned (image-only) PDF. Insufficient text was extracted. A vision-capable model is required." });
    }

    const snippet = rawText.slice(0, 12000);

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.05,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: "You are an expert SDS analyst. Extract ALL fields from the SDS text and return ONLY valid JSON with no markdown or explanation.",
          },
          {
            role: "user",
            content: `Extract these fields from this Safety Data Sheet and return as JSON:
{
  "manufacturer_name": null,
  "city": null,
  "state": null,
  "zip": null,
  "email": null,
  "contact": null,
  "emergency": null,
  "ghs_pictograms": [],
  "chemical_name": null,
  "product_number": null,
  "trade_names": [],
  "composition": [{"name":"","cas":"","percentage":""}],
  "voc_content": null,
  "solid_content": null
}

Rules:
- ghs_pictograms: list ALL pictogram names found in Section 2 and Section 14 (e.g. "Flame", "Corrosion", "Skull and Crossbones", "Exclamation Mark", "Health Hazard", "Exploding Bomb", "Oxidizer", "Compressed Gas", "Environmental Hazard")
- composition: include ALL ingredients from Section 3 with CAS numbers and percentages
- emergency: look for CHEMTREC, INFOTRAC, or emergency phone numbers
- Use null for any field not found, empty array [] for empty lists

SDS TEXT:
${snippet}`,
          },
        ],
      }),
    });

    const groqData = await groqRes.json();
    const raw      = groqData.choices?.[0]?.message?.content?.trim() || "{}";
    let fields = {};
    try {
      let jsonStr = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
      const s = jsonStr.indexOf("{"), e = jsonStr.lastIndexOf("}") + 1;
      if (s >= 0) jsonStr = jsonStr.slice(s, e);
      fields = JSON.parse(jsonStr);
    } catch {
      return res.json({ ok: false, error: "Could not parse extracted fields from Groq response." });
    }

    return res.json({ ok: true, fields, textChars: rawText.length, usage: groqData.usage || null });

  } catch (err) {
    return res.json({ ok: false, error: err.message });
  }
});

// =====================================================================
// MONITORING REPORTS — SDS
// =====================================================================
app.get("/admin/sds/reports-data", async (req, res) => {
  try {
    const period    = req.query.period   || "week";
    const fromParam = req.query.fromDate || null;
    const toParam   = req.query.toDate   || null;
    const now = new Date();
    let fromDate = null;
    let toDate   = new Date(now); toDate.setHours(23, 59, 59, 999);

    if (fromParam && toParam) {
      fromDate = new Date(fromParam + "T00:00:00.000Z");
      toDate   = new Date(toParam   + "T23:59:59.999Z");
    } else {
      if (period === "today") {
        fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 6); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    const usersSnap = await db.collection("users").get();
    const userMap = {};
    usersSnap.docs.forEach(d => { userMap[d.id] = d.data().name || d.data().email || d.id; });

    const sheetsSnap = await db.collection("sds_sheets").get();
    const STAGES = ["search", "supersede", "transcription", "billing"];
    // Key: uid|||sheetId — one entry per user per sheet
    const ubStats = {};

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;
      const recsSnap = await db.collection("sds_sheets").doc(sheetId).collection("references").get();

      for (const recDoc of recsSnap.docs) {
        const d = recDoc.data();
        const lang = String(d.common?.language || d.search?.language || "english").toLowerCase().trim();
        const langSuffix = (!lang || lang === "english") ? "E" : "ML";

        for (const stage of STAGES) {
          const sd = d[stage];
          if (!sd || !sd.assignedTo) continue;

          const uid = sd.assignedTo;
          const completedAt = sd.completedAt?.toDate ? sd.completedAt.toDate() : null;

          // completedAt respects the period filter; totalAssigned is always the full count
          const inPeriodCompleted = completedAt && (!fromDate || (completedAt >= fromDate && completedAt <= toDate));

          const k = `${uid}|||${sheetId}`;
          if (!ubStats[k]) {
            ubStats[k] = {
              userId: uid, name: userMap[uid] || uid, sheetId,
              totalAssigned: 0,
              allTimeTotal: 0,
              searchE: 0, searchML: 0,
              supersedeE: 0, supersedeML: 0,
              transcriptionE: 0, transcriptionML: 0,
              billingE: 0, billingML: 0,
              total: 0, records: [],
            };
          }

          ubStats[k].totalAssigned++; // total ever assigned — no period filter
          if (completedAt) ubStats[k].allTimeTotal++; // all-time completed regardless of period

          if (inPeriodCompleted) {
            ubStats[k][`${stage}${langSuffix}`]++;
            ubStats[k].total++;
            ubStats[k].records.push({
              sheet: sheetId,
              refId: d.repoId || recDoc.id,
              chemical: d.common?.chemicalProduct || "",
              language: d.common?.language || d.search?.language || d.supersede?.language || d.transcription?.language || "",
              stage,
              completedAt: completedAt.toISOString(),
            });
          }
        }
      }
    }

    // One row per user per sheet, sorted by assigned desc
    const rows = Object.values(ubStats)
      .sort((a, b) => b.totalAssigned - a.totalAssigned || a.name.localeCompare(b.name));

    // Unique users for filter dropdown
    const seen = {};
    rows.forEach(r => { seen[r.userId] = r.name; });
    const users = Object.entries(seen).map(([userId, name]) => ({ userId, name })).sort((a,b) => a.name.localeCompare(b.name));

    const totals = rows.reduce((acc, r) => {
      acc.totalAssigned += r.totalAssigned;
      acc.allTimeTotal  += r.allTimeTotal;
      ["searchE","searchML","supersedeE","supersedeML","transcriptionE","transcriptionML","billingE","billingML","total"]
        .forEach(k => { acc[k] = (acc[k] || 0) + (r[k] || 0); });
      return acc;
    }, { totalAssigned: 0, allTimeTotal: 0, searchE:0, searchML:0, supersedeE:0, supersedeML:0, transcriptionE:0, transcriptionML:0, billingE:0, billingML:0, total:0 });

    res.json({ ok: true, period, totals, rows, users });
  } catch (err) {
    console.error("SDS REPORTS ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =====================================================================
// MONITORING REPORTS — DQ
// =====================================================================
app.get("/admin/dq/reports-data", async (req, res) => {
  try {
    const period    = req.query.period   || "week";
    const fromParam = req.query.fromDate || null;
    const toParam   = req.query.toDate   || null;
    const now = new Date();
    let fromDate = null;
    let toDate   = new Date(now); toDate.setHours(23, 59, 59, 999);

    if (fromParam && toParam) {
      fromDate = new Date(fromParam + "T00:00:00.000Z");
      toDate   = new Date(toParam   + "T23:59:59.999Z");
    } else {
      if (period === "today") {
        fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 6); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    const usersSnap = await db.collection("users").get();
    const userMap = {};
    usersSnap.docs.forEach(d => { userMap[d.id] = d.data().name || d.data().email || d.id; });

    const sheetsSnap = await db.collection("dq_sheets").get();
    // Key: uid|||sheetId — one entry per user per sheet
    const ubStats = {};

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;
      const recsSnap = await db.collection("dq_sheets").doc(sheetId).collection("references").get();

      for (const recDoc of recsSnap.docs) {
        const d = recDoc.data();
        const uid = d.assignedTo;
        if (!uid) continue;

        const updatedAt = d.updatedAt ? new Date(d.updatedAt) : null;
        const isCompleted = d.billingReady === true;

        // completedAt respects the period filter; totalAssigned is always the full count
        const inPeriodCompleted = isCompleted && (!fromDate || (updatedAt && updatedAt >= fromDate && updatedAt <= toDate));

        const k = `${uid}|||${sheetId}`;
        if (!ubStats[k]) {
          ubStats[k] = {
            userId: uid, name: userMap[uid] || uid, sheetId,
            totalAssigned: 0, allTimeCompleted: 0, totalCompleted: 0, records: [],
          };
        }

        ubStats[k].totalAssigned++; // total ever assigned — no period filter
        if (isCompleted) ubStats[k].allTimeCompleted++; // all-time completed regardless of period
        if (inPeriodCompleted) {
          ubStats[k].totalCompleted++;
          ubStats[k].records.push({
            sheet: sheetId,
            refId: recDoc.id,
            chemical: d.common?.chemicalProduct || d.chemicalProduct || "",
            completedAt: updatedAt?.toISOString() || "",
          });
        }
      }
    }

    // One row per user per sheet, sorted by assigned desc
    const rows = Object.values(ubStats)
      .sort((a, b) => b.totalAssigned - a.totalAssigned || a.name.localeCompare(b.name));

    // Unique users for filter dropdown
    const seen = {};
    rows.forEach(r => { seen[r.userId] = r.name; });
    const users = Object.entries(seen).map(([userId, name]) => ({ userId, name })).sort((a,b) => a.name.localeCompare(b.name));

    const totals = rows.reduce((acc, r) => {
      acc.totalAssigned     += r.totalAssigned;
      acc.allTimeCompleted  += r.allTimeCompleted;
      acc.totalCompleted    += r.totalCompleted;
      return acc;
    }, { totalAssigned: 0, allTimeCompleted: 0, totalCompleted: 0 });

    res.json({ ok: true, period, totals, rows, users });
  } catch (err) {
    console.error("DQ REPORTS ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// =====================================================================
// MONITORING REPORTS — BATCH
// =====================================================================
app.get("/admin/batch/reports-data", async (req, res) => {
  try {
    const period    = req.query.period   || "week";
    const fromParam = req.query.fromDate || null;
    const toParam   = req.query.toDate   || null;
    const now = new Date();
    let fromDate = null;
    let toDate   = new Date(now); toDate.setHours(23, 59, 59, 999);

    if (fromParam && toParam) {
      fromDate = new Date(fromParam + "T00:00:00.000Z");
      toDate   = new Date(toParam   + "T23:59:59.999Z");
    } else {
      if (period === "today") {
        fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "week") {
        fromDate = new Date(now); fromDate.setDate(fromDate.getDate() - 6); fromDate.setHours(0, 0, 0, 0);
      } else if (period === "month") {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }

    const usersSnap = await db.collection("users").get();
    const userMap = {};
    usersSnap.docs.forEach(d => { userMap[d.id] = d.data().name || d.data().email || d.id; });

    const sheetsSnap = await db.collection("batch_sheets").get();
    // Key: uid|||sheetId — one entry per user per sheet
    const ubStats = {};

    for (const sheetDoc of sheetsSnap.docs) {
      const sheetId = sheetDoc.id;
      const recsSnap = await db.collection("batch_sheets").doc(sheetId).collection("records").get();

      for (const recDoc of recsSnap.docs) {
        const d = recDoc.data();
        const uid = d.verification?.assignedTo;
        if (!uid) continue;

        const completedAt = d.verification?.completedAt?.toDate ? d.verification.completedAt.toDate() : null;
        const isCompleted = d.verification?.status === "Completed";

        // completedAt respects the period filter; assigned is always the full count
        const inPeriodCompleted = isCompleted && (!fromDate || (completedAt && completedAt >= fromDate && completedAt <= toDate));

        const k = `${uid}|||${sheetId}`;
        if (!ubStats[k]) {
          ubStats[k] = {
            userId: uid, name: userMap[uid] || uid, sheetId,
            assigned: 0, allTimeCompleted: 0, completed: 0, records: [],
          };
        }

        ubStats[k].assigned++; // total ever assigned — no period filter
        if (isCompleted) ubStats[k].allTimeCompleted++; // all-time completed regardless of period

        if (inPeriodCompleted) {
          ubStats[k].completed++;
          ubStats[k].records.push({
            sheet: sheetId,
            recordId: d.recordId || recDoc.id,
            repositoryNo: d.common?.newRepository || "",
            chemical: d.common?.chemicalName || "",
            language: d.common?.language || "",
            completedAt: completedAt?.toISOString() || "",
          });
        }
      }
    }

    // One row per user per sheet, sorted by assigned desc
    const rows = Object.values(ubStats)
      .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name));

    // Unique users for filter dropdown
    const seen = {};
    rows.forEach(r => { seen[r.userId] = r.name; });
    const users = Object.entries(seen).map(([userId, name]) => ({ userId, name })).sort((a,b) => a.name.localeCompare(b.name));

    const totals = rows.reduce((acc, r) => {
      acc.totalAssigned    += r.assigned;
      acc.allTimeCompleted += r.allTimeCompleted;
      acc.totalCompleted   += r.completed;
      return acc;
    }, { totalAssigned: 0, allTimeCompleted: 0, totalCompleted: 0 });

    res.json({ ok: true, period, totals, rows, users });
  } catch (err) {
    console.error("BATCH REPORTS ERROR:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Sheet due dates (used by user-facing pages) ───────────────────
app.get("/sheets/due-dates", async (req, res) => {
  try {
    const [sdsSnap, dqSnap, batchSnap] = await Promise.all([
      db.collection("sds_sheets").get(),
      db.collection("dq_sheets").get(),
      db.collection("batch_sheets").get(),
    ]);
    const sds = {}, dq = {}, batch = {};
    sdsSnap.docs.forEach(d   => { const dd = d.data().dueDate; if (dd) sds[d.id]   = dd; });
    dqSnap.docs.forEach(d    => { const dd = d.data().dueDate; if (dd) dq[d.id]    = dd; });
    batchSnap.docs.forEach(d => { const dd = d.data().dueDate; if (dd) batch[d.id] = dd; });
    res.json({ ok: true, sds, dq, batch });
  } catch (err) {
    res.json({ ok: false, error: err.message });
  }
});

// ── Deadline alerts (admin chatbot notifications) ─────────────────
app.get("/admin/deadline-alerts", async (req, res) => {
  try {
    function calcDaysLeft(dateStr) {
      if (!dateStr) return null;
      const due    = new Date(dateStr + "T00:00:00Z");
      const nowUTC = new Date();
      nowUTC.setUTCHours(0, 0, 0, 0);
      return Math.ceil((due - nowUTC) / 86400000);
    }
    function getUrgency(days) {
      if (days === null) return null;
      if (days < 0)  return "overdue";
      if (days <= 2) return "critical";
      if (days <= 7) return "warning";
      return "ok";
    }
    function buildUserStats(userMap) {
      const all = Object.entries(userMap).map(([userId, s]) => ({
        userId,
        assigned: s.assigned,
        completed: s.completed,
        pending: s.assigned - s.completed,
        completionRate: s.assigned > 0 ? Math.round((s.completed / s.assigned) * 100) : 0,
      }));
      if (!all.length) return { all: [], avgRate: 0 };
      const avgRate = Math.round(all.reduce((sum, u) => sum + u.completionRate, 0) / all.length);
      all.forEach(u => { u.vsAvg = u.completionRate >= avgRate ? "above" : "below"; });
      return { all, avgRate };
    }

    const alerts = [];

    // ── SDS ──
    const sdsSheets = await db.collection("sds_sheets").get();
    for (const sheetDoc of sdsSheets.docs) {
      const { dueDate } = sheetDoc.data();
      if (!dueDate) continue;
      const days = calcDaysLeft(dueDate);
      const urg  = getUrgency(days);
      if (!urg || urg === "ok") continue;

      const refs = await sheetDoc.ref.collection("references").get();
      const userMap = {};
      refs.forEach(ref => {
        const d = ref.data();
        const uid = d.assignedTo;
        if (!uid) return;
        if (!userMap[uid]) userMap[uid] = { assigned: 0, completed: 0 };
        userMap[uid].assigned++;
        if (d.currentStage === "completed") userMap[uid].completed++;
      });
      const { all, avgRate } = buildUserStats(userMap);
      const users = all.filter(u => u.pending > 0);
      if (!users.length) continue;
      alerts.push({ module: "SDS", sheet: sheetDoc.id, dueDate, daysLeft: days, urgency: urg, avgCompletionRate: avgRate, users });
    }

    // ── DQ ──
    const dqSheets = await db.collection("dq_sheets").get();
    for (const sheetDoc of dqSheets.docs) {
      const { dueDate } = sheetDoc.data();
      if (!dueDate) continue;
      const days = calcDaysLeft(dueDate);
      const urg  = getUrgency(days);
      if (!urg || urg === "ok") continue;

      const refs = await sheetDoc.ref.collection("references").get();
      const userMap = {};
      refs.forEach(ref => {
        const d = ref.data();
        const uid = d.assignedTo;
        if (!uid) return;
        if (!userMap[uid]) userMap[uid] = { assigned: 0, completed: 0 };
        userMap[uid].assigned++;
        if (d.billingReady === true) userMap[uid].completed++;
      });
      const { all, avgRate } = buildUserStats(userMap);
      const users = all.filter(u => u.pending > 0);
      if (!users.length) continue;
      alerts.push({ module: "DQ", sheet: sheetDoc.id, dueDate, daysLeft: days, urgency: urg, avgCompletionRate: avgRate, users });
    }

    // ── BATCH ──
    const batchSheets = await db.collection("batch_sheets").get();
    for (const sheetDoc of batchSheets.docs) {
      const { dueDate } = sheetDoc.data();
      if (!dueDate) continue;
      const days = calcDaysLeft(dueDate);
      const urg  = getUrgency(days);
      if (!urg || urg === "ok") continue;

      const records = await sheetDoc.ref.collection("records").get();
      const userMap = {};
      records.forEach(rec => {
        const d   = rec.data();
        const uid = d.verification?.assignedTo || d.assignedTo;
        if (!uid) return;
        if (!userMap[uid]) userMap[uid] = { assigned: 0, completed: 0 };
        userMap[uid].assigned++;
        if (d.workflowStatus === "BILLING_READY" || d.verification?.status === "completed") userMap[uid].completed++;
      });
      const { all, avgRate } = buildUserStats(userMap);
      const users = all.filter(u => u.pending > 0);
      if (!users.length) continue;
      alerts.push({ module: "BATCH", sheet: sheetDoc.id, dueDate, daysLeft: days, urgency: urg, avgCompletionRate: avgRate, users });
    }

    // Most urgent first
    const urgOrder = { overdue: 0, critical: 1, warning: 2 };
    alerts.sort((a, b) => (urgOrder[a.urgency] ?? 3) - (urgOrder[b.urgency] ?? 3));
    res.json({ ok: true, alerts });
  } catch (err) {
    console.error("DEADLINE ALERTS ERROR:", err);
    res.json({ ok: false, error: err.message });
  }
});

// ============================================================================
//  NOTIFICATION SETTINGS & AUTOMATED EMAIL
// ============================================================================
const nodemailer = require("nodemailer");

// GET /admin/notification-settings
app.get("/admin/notification-settings", async (req, res) => {
  try {
    const doc = await db.collection("notification_settings").doc("config").get();
    if (!doc.exists) {
      return res.json({ ok: true, settings: {
        senderEmail: "", recipientEmails: [], thresholds: [75],
        enabled: false, notifiedMap: {}, hasPassword: false,
      }});
    }
    const d = doc.data();
    res.json({ ok: true, settings: {
      senderEmail: d.senderEmail || "",
      recipientEmails: d.recipientEmails || [],
      thresholds: d.thresholds || [75],
      enabled: d.enabled || false,
      authMethod: d.authMethod || "oauth2",
      notifiedMap: d.notifiedMap || {},
      hasPassword: !!(d.senderPassword),
      hasOAuth: !!(d.oauthClientId && d.oauthClientSecret && d.oauthRefreshToken),
      lastChecked: d.lastChecked || null,
      lastSent: d.lastSent || null,
    }});
  } catch (err) { errJson(res, err.message); }
});

// POST /admin/notification-settings
app.post("/admin/notification-settings", async (req, res) => {
  try {
    const { senderEmail, senderPassword, recipientEmails, thresholds, enabled, authMethod,
            oauthClientId, oauthClientSecret, oauthRefreshToken } = req.body;
    const ref = db.collection("notification_settings").doc("config");
    const existing = await ref.get();
    const prev = existing.exists ? existing.data() : {};

    const update = {
      senderEmail: senderEmail || "",
      recipientEmails: recipientEmails || [],
      thresholds: (thresholds || [75]).map(Number).filter(n => n > 0 && n <= 100).sort((a, b) => a - b),
      enabled: !!enabled,
      authMethod: authMethod || "oauth2",
      updatedAt: Date.now(),
      notifiedMap: prev.notifiedMap || {},
      // Keep existing secrets if new ones not provided
      senderPassword:      senderPassword      || prev.senderPassword      || "",
      oauthClientId:       oauthClientId       || prev.oauthClientId       || "",
      oauthClientSecret:   oauthClientSecret   || prev.oauthClientSecret   || "",
      oauthRefreshToken:   oauthRefreshToken   || prev.oauthRefreshToken   || "",
    };
    await ref.set(update);
    res.json({ ok: true });
  } catch (err) { errJson(res, err.message); }
});

// POST /admin/reset-notification-map
app.post("/admin/reset-notification-map", async (req, res) => {
  try {
    await db.collection("notification_settings").doc("config").update({ notifiedMap: {} });
    res.json({ ok: true });
  } catch (err) { errJson(res, err.message); }
});

// Helper: aggregate all sheet progress
async function aggregateSheetProgress() {
  const result = { sds: {}, dq: {}, batch: {} };

  // SDS
  const sdsSnap = await db.collection("sds_sheets").get();
  const SDS_STAGES = ["search", "supersede", "transcription", "billing"];
  for (const sheetDoc of sdsSnap.docs) {
    const sheetId = sheetDoc.id;
    const recsSnap = await db.collection("sds_sheets").doc(sheetId).collection("references").get();
    const users = {};
    let assigned = 0, completed = 0;
    for (const recDoc of recsSnap.docs) {
      const d = recDoc.data();
      for (const stage of SDS_STAGES) {
        const sd = d[stage];
        if (!sd || !sd.assignedTo) continue;
        const uid = sd.assignedTo;
        if (!users[uid]) users[uid] = { assigned: 0, completed: 0 };
        users[uid].assigned++; assigned++;
        if (sd.completedAt) { users[uid].completed++; completed++; }
      }
    }
    result.sds[sheetId] = { sheetId, assigned, completed, users };
  }

  // DQ
  const dqSnap = await db.collection("dq_sheets").get();
  for (const sheetDoc of dqSnap.docs) {
    const sheetId = sheetDoc.id;
    const recsSnap = await db.collection("dq_sheets").doc(sheetId).collection("references").get();
    const users = {};
    let assigned = 0, completed = 0;
    for (const recDoc of recsSnap.docs) {
      const d = recDoc.data();
      const uid = d.assignedTo;
      if (!uid) continue;
      if (!users[uid]) users[uid] = { assigned: 0, completed: 0 };
      users[uid].assigned++; assigned++;
      if (d.billingReady === true) { users[uid].completed++; completed++; }
    }
    result.dq[sheetId] = { sheetId, assigned, completed, users };
  }

  // Batch
  const batchSnap = await db.collection("batch_sheets").get();
  for (const sheetDoc of batchSnap.docs) {
    const sheetId = sheetDoc.id;
    const recsSnap = await db.collection("batch_sheets").doc(sheetId).collection("records").get();
    const users = {};
    let assigned = 0, completed = 0;
    for (const recDoc of recsSnap.docs) {
      const d = recDoc.data();
      const uid = d.verification?.assignedTo;
      if (!uid) continue;
      if (!users[uid]) users[uid] = { assigned: 0, completed: 0 };
      users[uid].assigned++; assigned++;
      if (d.verification?.status === "Completed") { users[uid].completed++; completed++; }
    }
    result.batch[sheetId] = { sheetId, assigned, completed, users };
  }

  return result;
}

// Helper: build HTML email
function buildProgressEmailHtml(items, userMap) {
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const cards = items.map(n => {
    const pct = n.assigned ? Math.round((n.completed / n.assigned) * 100) : 0;
    const pending = Math.max(0, n.assigned - n.completed);
    const barColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#f59e0b" : "#dc2626";
    const pctColor = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";

    // Progress bar: filled cell + empty cell side by side in a table
    const filledPct = Math.max(1, pct);
    const emptyPct  = 100 - filledPct;
    const barRow = pct === 100
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;"><tr>
           <td width="100%" height="10" bgcolor="${barColor}" style="border-radius:5px;font-size:0;line-height:0;">&nbsp;</td>
         </tr></table>`
      : `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;background:#e2e8f0;border-radius:5px;overflow:hidden;"><tr>
           <td width="${filledPct}%" height="10" bgcolor="${barColor}" style="font-size:0;line-height:0;">&nbsp;</td>
           <td width="${emptyPct}%" height="10" style="font-size:0;line-height:0;">&nbsp;</td>
         </tr></table>`;

    const thresholdTag = n.threshold
      ? `&nbsp;<span style="background:#3b82f6;color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${n.threshold}% threshold</span>`
      : "";

    // Per-user rows
    const userRows = Object.entries(n.users || {}).map(([uid, u], idx) => {
      const up  = u.assigned ? Math.round((u.completed / u.assigned) * 100) : 0;
      const upd = Math.max(0, u.assigned - u.completed);
      const uc  = up >= 80 ? "#16a34a" : up >= 50 ? "#d97706" : "#dc2626";
      const bg  = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `<tr bgcolor="${bg}">
        <td style="padding:7px 10px;font-size:13px;border-bottom:1px solid #e2e8f0;">${userMap[uid] || uid}</td>
        <td style="padding:7px 10px;font-size:13px;text-align:center;border-bottom:1px solid #e2e8f0;">${u.assigned}</td>
        <td style="padding:7px 10px;font-size:13px;text-align:center;color:#16a34a;font-weight:700;border-bottom:1px solid #e2e8f0;">${u.completed}</td>
        <td style="padding:7px 10px;font-size:13px;text-align:center;color:#dc2626;font-weight:700;border-bottom:1px solid #e2e8f0;">${upd}</td>
        <td style="padding:7px 10px;font-size:13px;text-align:center;font-weight:700;color:${uc};border-bottom:1px solid #e2e8f0;">${up}%</td>
      </tr>`;
    }).join("");

    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;margin-bottom:16px;border-collapse:collapse;">
      <tr>
        <td style="padding:14px 16px 0 16px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;">
              ${n.workflow}${thresholdTag}
            </td>
            <td align="right" style="font-size:22px;font-weight:800;color:${pctColor};">${pct}%</td>
          </tr></table>
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-top:2px;">${n.sheetId.replace(/_/g, " ")}</div>
          ${barRow}
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;"><tr>
            <td style="font-size:12px;color:#64748b;padding-right:16px;">${n.assigned} total</td>
            <td style="font-size:12px;color:#16a34a;font-weight:600;padding-right:16px;">&#10003; ${n.completed} done</td>
            <td style="font-size:12px;color:#dc2626;font-weight:600;">&#8987; ${pending} pending</td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:0 16px 14px 16px;">
          <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Per-User Breakdown</div>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
            <tr bgcolor="#f1f5f9">
              <th style="padding:6px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;">User</th>
              <th style="padding:6px 10px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;">Assigned</th>
              <th style="padding:6px 10px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;">Completed</th>
              <th style="padding:6px 10px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;">Pending</th>
              <th style="padding:6px 10px;text-align:center;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:700;">% Done</th>
            </tr>
            ${userRows}
          </table>
        </td>
      </tr>
    </table>`;
  }).join("");

  const uniqueSheets = [...new Set(items.map(n => n.sheetId.replace(/_/g, " ")))].join(", ");
  const thresholdList = [...new Set(items.filter(n => n.threshold).map(n => `${n.threshold}%`))].join(", ");
  const subTitle = thresholdList
    ? `Threshold crossed: ${thresholdList} &mdash; ${uniqueSheets}`
    : `Full progress report &mdash; ${new Date().toLocaleDateString("en-IN")}`;

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9"><tr><td align="center" style="padding:20px 10px;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:collapse;">

    <!-- HEADER -->
    <tr>
      <td bgcolor="#0f172a" style="padding:20px 24px;border-radius:10px 10px 0 0;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">SARN Technologies</div>
        <div style="color:#ffffff;font-size:19px;font-weight:700;margin-bottom:4px;">Progress Report Alert</div>
        <div style="color:#94a3b8;font-size:12px;">${subTitle}</div>
      </td>
    </tr>

    <!-- BODY -->
    <tr>
      <td bgcolor="#ffffff" style="padding:20px 24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">Business Completion Progress</div>
        ${cards}
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td bgcolor="#f8fafc" style="padding:12px 24px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
        <div style="color:#94a3b8;font-size:11px;">This is an auto-generated report by <strong style="color:#64748b;">SARN Technologies</strong>. Please do not reply to this email.</div>
        <div style="color:#cbd5e1;font-size:10px;margin-top:4px;">${now} IST</div>
      </td>
    </tr>

  </table>
</td></tr></table>
</body></html>`;
}

// POST /admin/trigger-notifications
app.post("/admin/trigger-notifications", async (req, res) => {
  try {
    const { forceAll } = req.body;

    const configDoc = await db.collection("notification_settings").doc("config").get();
    if (!configDoc.exists) return res.json({ ok: true, sent: false, reason: "No settings configured" });

    const cfg = configDoc.data();
    if (!cfg.enabled && !forceAll) return res.json({ ok: true, sent: false, reason: "Notifications disabled" });
    if (!cfg.senderEmail) return res.json({ ok: false, error: "Sender email not configured" });
    const useOAuth = cfg.authMethod === "oauth2" && cfg.oauthClientId && cfg.oauthClientSecret && cfg.oauthRefreshToken;
    if (!useOAuth && !cfg.senderPassword) return res.json({ ok: false, error: "Auth credentials not configured. Set up Gmail API (OAuth2) or an App Password." });
    if (!cfg.recipientEmails?.length) return res.json({ ok: false, error: "No recipient emails configured" });

    const thresholds = (cfg.thresholds || [75]).map(Number).sort((a, b) => a - b);
    const notifiedMap = cfg.notifiedMap || {};

    const progress = await aggregateSheetProgress();

    const usersSnap = await db.collection("users").get();
    const userMap = {};
    usersSnap.docs.forEach(d => { userMap[d.id] = d.data().name || d.data().email || d.id; });

    const toNotify = [];
    const newEntries = {};

    if (forceAll) {
      // Send all sheets regardless of thresholds
      for (const [workflow, sheets] of Object.entries(progress)) {
        for (const [sheetId, data] of Object.entries(sheets)) {
          if (!data.assigned) continue;
          toNotify.push({ workflow: workflow.toUpperCase(), sheetId, ...data, threshold: null });
        }
      }
    } else {
      // Only notify for newly crossed thresholds
      for (const [workflow, sheets] of Object.entries(progress)) {
        for (const [sheetId, data] of Object.entries(sheets)) {
          if (!data.assigned) continue;
          const pct = Math.round((data.completed / data.assigned) * 100);
          for (const threshold of thresholds) {
            const key = `${workflow}__${sheetId}__${threshold}`;
            if (pct >= threshold && !notifiedMap[key]) {
              toNotify.push({ workflow: workflow.toUpperCase(), sheetId, ...data, pct, threshold });
              newEntries[key] = true;
            }
          }
        }
      }
    }

    if (!toNotify.length) {
      await db.collection("notification_settings").doc("config").update({ lastChecked: Date.now() });
      return res.json({ ok: true, sent: false, reason: "No new thresholds crossed" });
    }

    const html = buildProgressEmailHtml(toNotify, userMap);
    const uniqueSheets = [...new Set(toNotify.map(n => n.sheetId.replace(/_/g, " ")))].join(", ");
    const subject = forceAll
      ? `SARN Progress Report — ${new Date().toLocaleDateString("en-IN")}`
      : `SARN Alert: Progress threshold crossed — ${uniqueSheets}`;

    const transportAuth = useOAuth
      ? {
          type: "OAuth2",
          user: cfg.senderEmail,
          clientId: cfg.oauthClientId,
          clientSecret: cfg.oauthClientSecret,
          refreshToken: cfg.oauthRefreshToken,
        }
      : { user: cfg.senderEmail, pass: cfg.senderPassword };

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: transportAuth,
    });

    await transporter.sendMail({
      from: `"SARN Technologies" <${cfg.senderEmail}>`,
      to: cfg.recipientEmails.join(", "),
      subject,
      html,
    });

    await db.collection("notification_settings").doc("config").update({
      notifiedMap: { ...notifiedMap, ...newEntries },
      lastChecked: Date.now(),
      lastSent: Date.now(),
    });

    res.json({ ok: true, sent: true, count: toNotify.length, recipients: cfg.recipientEmails.length });
  } catch (err) {
    console.error("TRIGGER NOTIFICATIONS ERROR:", err);
    errJson(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEETING INVITE EMAIL HELPER
// ─────────────────────────────────────────────────────────────────────────────

function buildMeetingInviteHtml({ title, description, scheduledAtDisplay, durationMinutes, participants, createdByName, joinUrl }) {
  const names = participants.map(p => p.userName).join(", ");
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9"><tr><td align="center" style="padding:20px 10px;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:collapse;">
    <tr>
      <td bgcolor="#0f172a" style="padding:20px 24px;border-radius:10px 10px 0 0;">
        <div style="color:#94a3b8;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">SARN Technologies</div>
        <div style="color:#ffffff;font-size:19px;font-weight:700;margin-bottom:4px;">Meeting Invitation</div>
        <div style="color:#94a3b8;font-size:12px;">You have been invited to a scheduled meeting</div>
      </td>
    </tr>
    <tr>
      <td bgcolor="#ffffff" style="padding:24px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;">
          <tr bgcolor="#f8fafc">
            <td style="padding:18px;">
              <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:14px;">${title}</div>
              ${description ? `<div style="font-size:13px;color:#64748b;margin-bottom:14px;">${description}</div>` : ""}
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td style="padding:4px 16px 4px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">When</td>
                    <td style="padding:4px 0;font-size:13px;color:#0f172a;font-weight:600;">${scheduledAtDisplay} IST</td></tr>
                <tr><td style="padding:4px 16px 4px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Duration</td>
                    <td style="padding:4px 0;font-size:13px;color:#0f172a;">${durationMinutes} minutes</td></tr>
                <tr><td style="padding:4px 16px 4px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Organizer</td>
                    <td style="padding:4px 0;font-size:13px;color:#0f172a;">${createdByName}</td></tr>
                <tr><td style="padding:4px 16px 4px 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Attendees</td>
                    <td style="padding:4px 0;font-size:13px;color:#0f172a;">${names}</td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" style="padding-bottom:16px;">
            <a href="${joinUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Join Meeting</a>
          </td>
        </tr></table>
        <div style="padding:12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
          <div style="font-size:11px;color:#94a3b8;margin-bottom:4px;">Or copy this link:</div>
          <div style="font-size:12px;color:#2563eb;word-break:break-all;">${joinUrl}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td bgcolor="#f8fafc" style="padding:12px 24px;text-align:center;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
        <div style="color:#94a3b8;font-size:11px;">Auto-generated by <strong style="color:#64748b;">SARN Technologies</strong>. Do not reply to this email.</div>
      </td>
    </tr>
  </table>
</td></tr></table>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER STATUS
// ─────────────────────────────────────────────────────────────────────────────

const VALID_STATUSES = ["available", "away", "busy", "dnd", "in-call", "presenting", "offline"];

// POST /user/status  { userId, status }
app.post("/user/status", async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!userId || !status) return res.json({ ok: false, error: "Missing fields" });
    if (!VALID_STATUSES.includes(status)) return res.json({ ok: false, error: "Invalid status" });
    await db.collection("users").doc(userId).update({ status, statusAt: new Date().toISOString() });
    res.json({ ok: true });
  } catch (err) { errJson(res, err.message); }
});

// GET /users/statuses  → { userId: { status, name } }
app.get("/users/statuses", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const statuses = {};
    snap.docs.forEach(d => {
      const data = d.data();
      statuses[d.id] = { status: data.status || "available", name: data.name || d.id };
    });
    res.json({ ok: true, statuses });
  } catch (err) { errJson(res, err.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// CALL ROOMS
// ─────────────────────────────────────────────────────────────────────────────

// POST /calls/create  { userId, userName }  → { roomId, meetLink }
app.post("/calls/create", async (req, res) => {
  try {
    const { userId, userName } = req.body;
    if (!userId) return res.json({ ok: false, error: "Missing userId" });
    const roomId = `sarn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let meetLink = "";
    try { meetLink = await createGoogleMeetLink(`SARN Group Call — ${userName || userId}`) || ""; }
    catch (e) { console.warn("GMeet link creation failed:", e.message); }
    await db.collection("call_rooms").doc(roomId).set({
      roomId, meetLink,
      createdBy: userId, createdByName: userName || userId,
      createdAt: new Date().toISOString(), active: true,
      participants: [{ userId, userName: userName || userId, joinedAt: new Date().toISOString() }],
    });
    await db.collection("users").doc(userId).update({ status: "in-call", statusAt: new Date().toISOString() });
    res.json({ ok: true, roomId, meetLink });
  } catch (err) { errJson(res, err.message); }
});

// GET /calls/active
app.get("/calls/active", async (req, res) => {
  try {
    const snap = await db.collection("call_rooms").where("active", "==", true).get();
    res.json({ ok: true, rooms: snap.docs.map(d => d.data()) });
  } catch (err) { errJson(res, err.message); }
});

// POST /calls/join  { roomId, userId, userName }
app.post("/calls/join", async (req, res) => {
  try {
    const { roomId, userId, userName } = req.body;
    const ref = db.collection("call_rooms").doc(roomId);
    const doc = await ref.get();
    if (!doc.exists || !doc.data().active) return res.json({ ok: false, error: "Room not active" });
    const participants = doc.data().participants || [];
    if (!participants.find(p => p.userId === userId)) {
      participants.push({ userId, userName: userName || userId, joinedAt: new Date().toISOString() });
      await ref.update({ participants });
    }
    await db.collection("users").doc(userId).update({ status: "in-call", statusAt: new Date().toISOString() });
    res.json({ ok: true });
  } catch (err) { errJson(res, err.message); }
});

// POST /calls/leave  { roomId, userId }
app.post("/calls/leave", async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const ref = db.collection("call_rooms").doc(roomId);
    const doc = await ref.get();
    if (!doc.exists) return res.json({ ok: false, error: "Room not found" });
    const participants = (doc.data().participants || []).filter(p => p.userId !== userId);
    await ref.update({ participants, active: participants.length > 0 });
    await db.collection("users").doc(userId).update({ status: "available", statusAt: new Date().toISOString() });
    res.json({ ok: true });
  } catch (err) { errJson(res, err.message); }
});

// POST /calls/direct  { callerId, callerName, calleeId }
app.post("/calls/direct", async (req, res) => {
  try {
    const { callerId, callerName, calleeId } = req.body;
    if (!callerId || !calleeId) return res.json({ ok: false, error: "Missing fields" });
    const roomId = `direct-${callerId}-${calleeId}-${Date.now()}`;
    let meetLink = "";
    try { meetLink = await createGoogleMeetLink(`SARN Call — ${callerName || callerId}`) || ""; }
    catch (e) { console.warn("GMeet link creation failed:", e.message); }
    await db.collection("call_rooms").doc(roomId).set({
      roomId, meetLink: meetLink || "", callType: "direct",
      createdBy: callerId, createdByName: callerName || callerId,
      calledUserId: calleeId,
      createdAt: new Date().toISOString(), active: true,
      participants: [{ userId: callerId, userName: callerName || callerId, joinedAt: new Date().toISOString() }],
    });
    await db.collection("users").doc(callerId).update({ status: "in-call", statusAt: new Date().toISOString() });
    res.json({ ok: true, roomId, meetLink });
  } catch (err) { errJson(res, err.message); }
});

// GET /calls/users  — full user directory with live status
app.get("/calls/users", async (req, res) => {
  try {
    const snap = await db.collection("users").get();
    const users = snap.docs.map(d => {
      const data = d.data();
      return { userId: d.id, name: data.name || d.id, email: data.email || "", role: data.role || "user", status: data.status || "available" };
    });
    res.json({ ok: true, users });
  } catch (err) { errJson(res, err.message); }
});

// GET /calls/room/:roomId  — fetch room details including meetLink
app.get("/calls/room/:roomId", async (req, res) => {
  try {
    const doc = await db.collection("call_rooms").doc(req.params.roomId).get();
    if (!doc.exists) return res.json({ ok: false, error: "Room not found" });
    res.json({ ok: true, room: doc.data() });
  } catch (err) { errJson(res, err.message); }
});

// ─────────────────────────────────────────────────────────────────────────────
// MEETINGS
// ─────────────────────────────────────────────────────────────────────────────

// POST /meetings/schedule
app.post("/meetings/schedule", async (req, res) => {
  try {
    const { title, description, scheduledAt, durationMinutes, createdBy, createdByName, participantIds } = req.body;
    if (!title || !scheduledAt || !createdBy) return res.json({ ok: false, error: "Title, time, and creator are required" });

    const meetingId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const allIds = [...new Set([createdBy, ...(participantIds || [])])];

    const participants = [];
    for (const uid of allIds) {
      const doc = await db.collection("users").doc(uid).get();
      if (doc.exists) {
        const data = doc.data();
        participants.push({ userId: uid, userName: data.name || uid, email: data.email || "" });
      }
    }

    // Create Google Meet link at the scheduled time
    const schedStart = new Date(scheduledAt);
    const schedEnd   = new Date(schedStart.getTime() + (durationMinutes || 60) * 60000);
    let meetLink = "";
    try { meetLink = await createGoogleMeetLink(title, schedStart.toISOString(), schedEnd.toISOString(), description || "") || ""; }
    catch (e) { console.warn("GMeet link creation failed:", e.message); }

    const meeting = {
      meetingId, meetLink: meetLink || "", title, description: description || "",
      scheduledAt, durationMinutes: durationMinutes || 60,
      createdBy, createdByName: createdByName || createdBy,
      participants, participantIds: allIds,
      status: "upcoming", createdAt: new Date().toISOString(),
    };
    await db.collection("meetings").doc(meetingId).set(meeting);

    let emailsSent = 0;
    try {
      const configDoc = await db.collection("notification_settings").doc("config").get();
      if (configDoc.exists) {
        const cfg = configDoc.data();
        const useOAuth = cfg.authMethod === "oauth2" && cfg.oauthClientId && cfg.oauthClientSecret && cfg.oauthRefreshToken;
        if ((useOAuth || cfg.senderPassword) && cfg.senderEmail) {
          const transportAuth = useOAuth
            ? { type: "OAuth2", user: cfg.senderEmail, clientId: cfg.oauthClientId, clientSecret: cfg.oauthClientSecret, refreshToken: cfg.oauthRefreshToken }
            : { user: cfg.senderEmail, pass: cfg.senderPassword };
          const transporter = nodemailer.createTransport({ service: "gmail", auth: transportAuth });
          const scheduledAtDisplay = new Date(scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
          const joinUrl = meetLink || "";
          const html = buildMeetingInviteHtml({ title, description, scheduledAtDisplay, durationMinutes: durationMinutes || 60, participants, createdByName: createdByName || createdBy, joinUrl });
          const toEmails = participants.filter(p => p.userId !== createdBy && p.email).map(p => p.email);
          if (toEmails.length) {
            await transporter.sendMail({ from: `"SARN Technologies" <${cfg.senderEmail}>`, to: toEmails.join(", "), subject: `Meeting Invite: ${title}`, html });
            emailsSent = toEmails.length;
          }
        }
      }
    } catch (emailErr) { console.warn("Meeting invite email failed:", emailErr.message); }

    res.json({ ok: true, meetingId, emailsSent });
  } catch (err) { errJson(res, err.message); }
});

// GET /meetings/mine?userId=
app.get("/meetings/mine", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json({ ok: false, error: "Missing userId" });
    const snap = await db.collection("meetings").where("participantIds", "array-contains", userId).get();
    const meetings = snap.docs.map(d => d.data());
    meetings.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json({ ok: true, meetings });
  } catch (err) { errJson(res, err.message); }
});

// ---------------- START ----------------
app.listen(PORT, () =>
  console.log(`🚀 Backend running on port ${PORT}`)
);
