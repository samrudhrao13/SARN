import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/apiClient";
import { StatusDot } from "../components/StatusPicker";

const TABS = ["Active Calls", "Call Someone", "Schedule Meeting", "My Meetings"];

const STATUS_LABEL = {
  available: "Available", away: "Away", busy: "Busy",
  dnd: "Do Not Disturb", "in-call": "In a Call",
  presenting: "Presenting", offline: "Offline",
};

export default function CallsMeetings() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");

  const [tab, setTab] = useState("Active Calls");
  const [activeCalls, setActiveCalls] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [myMeetings, setMyMeetings] = useState([]);
  const [meetForm, setMeetForm] = useState({ title: "", description: "", date: "", time: "", durationMinutes: 60, participantIds: [] });
  const [scheduling, setScheduling] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState({ text: "", ok: true });
  const [inviteOpen, setInviteOpen] = useState(null); // roomId of call for add-people panel

  const loadActiveCalls = useCallback(async () => {
    try { const r = await api.get("/calls/active"); setActiveCalls(r.data?.rooms || []); } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const r = await api.get("/calls/users");
      setUsers((r.data?.users || []).filter(u => u.userId !== user?.userId));
    } catch {}
  }, [user?.userId]);

  const loadMyMeetings = useCallback(async () => {
    if (!user?.userId) return;
    try {
      const r = await api.get(`/meetings/mine?userId=${user.userId}`);
      setMyMeetings(r.data?.meetings || []);
    } catch {}
  }, [user?.userId]);

  useEffect(() => {
    loadActiveCalls();
    loadUsers();
    loadMyMeetings();
    const id = setInterval(loadActiveCalls, 5000);
    return () => clearInterval(id);
  }, [loadActiveCalls, loadUsers, loadMyMeetings]);

  // ── ACTIONS ──────────────────────────────────────────────

  async function startGroupCall() {
    const r = await api.post("/calls/create", { userId: user.userId, userName: user.name || user.userId });
    if (r.data?.ok) navigate(`/call/${r.data.roomId}`);
  }

  async function callUser(u) {
    const r = await api.post("/calls/direct", { callerId: user.userId, callerName: user.name || user.userId, calleeId: u.userId });
    if (r.data?.ok) navigate(`/call/${r.data.roomId}`);
  }

  async function joinCall(roomId) {
    await api.post("/calls/join", { roomId, userId: user.userId, userName: user.name || user.userId }).catch(() => {});
    navigate(`/call/${roomId}`);
  }

  async function scheduleMeeting() {
    if (!meetForm.title || !meetForm.date || !meetForm.time) {
      setScheduleMsg({ text: "Title, date and time are required.", ok: false });
      return;
    }
    setScheduling(true);
    setScheduleMsg({ text: "", ok: true });
    try {
      const scheduledAt = new Date(`${meetForm.date}T${meetForm.time}:00`).toISOString();
      const r = await api.post("/meetings/schedule", {
        title: meetForm.title, description: meetForm.description,
        scheduledAt, durationMinutes: meetForm.durationMinutes,
        createdBy: user.userId, createdByName: user.name || user.userId,
        participantIds: meetForm.participantIds,
      });
      if (r.data?.ok) {
        const extra = r.data.emailsSent > 0 ? ` Email invites sent to ${r.data.emailsSent} participant(s).` : " (No email invites sent — sender not configured.)";
        setScheduleMsg({ text: `Meeting scheduled!${extra}`, ok: true });
        setMeetForm({ title: "", description: "", date: "", time: "", durationMinutes: 60, participantIds: [] });
        loadMyMeetings();
      } else {
        setScheduleMsg({ text: r.data?.error || "Failed to schedule.", ok: false });
      }
    } catch (e) {
      setScheduleMsg({ text: "Error: " + e.message, ok: false });
    }
    setScheduling(false);
  }

  function toggleParticipant(uid) {
    setMeetForm(f => ({
      ...f,
      participantIds: f.participantIds.includes(uid)
        ? f.participantIds.filter(id => id !== uid)
        : [...f.participantIds, uid],
    }));
  }

  function meetingStatus(m) {
    const now = Date.now();
    const start = new Date(m.scheduledAt).getTime();
    const end = start + (m.durationMinutes || 60) * 60000;
    if (now > end) return "ended";
    if (now >= start) return "ongoing";
    if (start - now <= 10 * 60000) return "starting-soon";
    return "upcoming";
  }

  const filteredUsers = users.filter(u =>
    (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.userId.toLowerCase().includes(userSearch.toLowerCase())
  );

  // ── RENDER ────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Calls &amp; Meetings</h2>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Connect with your team — direct calls, group calls, or scheduled meetings.</p>

      {/* TABS */}
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0", marginBottom: 24, gap: 2 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 20px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t ? 700 : 500,
            color: tab === t ? "#2563eb" : "#64748b",
            borderBottom: tab === t ? "2px solid #2563eb" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {t === "Active Calls" && `📞 ${t}`}
            {t === "Call Someone" && `👤 ${t}`}
            {t === "Schedule Meeting" && `📅 ${t}`}
            {t === "My Meetings" && `🗓 ${t}`}
          </button>
        ))}
      </div>

      {/* ── ACTIVE CALLS ──────────────────────────────────── */}
      {tab === "Active Calls" && (
        <div>
          <button onClick={startGroupCall} style={primaryBtn}>+ Start Group Call</button>
          <div style={{ height: 16 }} />
          {activeCalls.length === 0 ? (
            <Empty icon="📵" text="No active calls right now" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeCalls.map(room => {
                const isMine = room.participants?.find(p => p.userId === user?.userId);
                return (
                  <div key={room.roomId} style={card}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {room.callType === "direct" ? "Direct Call" : "Group Call"}
                          </span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
                          {room.callType === "direct" ? `${room.createdByName} — Direct Call` : `${room.createdByName}'s Group Call`}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
                          {room.participants?.length || 1} participant{room.participants?.length !== 1 ? "s" : ""}
                          {room.participants?.length > 0 && ": " + room.participants.map(p => p.userName).join(", ")}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {!isMine && (
                          <button onClick={() => joinCall(room.roomId)} style={primaryBtn}>Join</button>
                        )}
                        {isMine && (
                          <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600, alignSelf: "center" }}>You're here</span>
                        )}
                        <button
                          onClick={() => setInviteOpen(inviteOpen === room.roomId ? null : room.roomId)}
                          style={{ ...primaryBtn, background: "#1e293b" }}
                        >
                          + Invite
                        </button>
                      </div>
                    </div>
                    {/* INLINE INVITE PANEL */}
                    {inviteOpen === room.roomId && (
                      <div style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>
                          Notify someone to join
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                          {users
                            .filter(u => !room.participants?.find(p => p.userId === u.userId))
                            .map(u => (
                              <div key={u.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <StatusDot status={u.status} size={8} />
                                  <span style={{ fontSize: 13, color: "#0f172a" }}>{u.name || u.userId}</span>
                                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{STATUS_LABEL[u.status] || "Available"}</span>
                                </div>
                                <span style={{ fontSize: 11, color: "#64748b" }}>Will see live call notification</span>
                              </div>
                            ))}
                        </div>
                        <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
                          All users not in this call see an in-app notification automatically every 5 seconds.
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CALL SOMEONE ──────────────────────────────────── */}
      {tab === "Call Someone" && (
        <div>
          <input
            placeholder="Search by name or ID..."
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            style={searchInput}
          />
          {filteredUsers.length === 0 ? (
            <Empty icon="👤" text="No users found" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredUsers.map(u => (
                <div key={u.userId} style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", background: "#1e293b",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "white", fontWeight: 700, fontSize: 16, flexShrink: 0,
                    }}>
                      {(u.name || u.userId).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <StatusDot status={u.status} size={9} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{u.name || u.userId}</span>
                        <span style={{ fontSize: 11, background: "#f1f5f9", color: "#475569", padding: "1px 8px", borderRadius: 10, textTransform: "capitalize" }}>{u.role}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                        {STATUS_LABEL[u.status] || "Available"}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => callUser(u)} style={{ ...primaryBtn, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📞</span> Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEDULE MEETING ──────────────────────────────── */}
      {tab === "Schedule Meeting" && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {/* Form */}
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={formGroup}>
              <label style={lbl}>Meeting Title *</label>
              <input value={meetForm.title} onChange={e => setMeetForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly Sync" style={inputSt} />
            </div>
            <div style={formGroup}>
              <label style={lbl}>Description (optional)</label>
              <textarea value={meetForm.description} onChange={e => setMeetForm(f => ({ ...f, description: e.target.value }))} placeholder="Agenda, notes..." rows={3} style={{ ...inputSt, resize: "vertical" }} />
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ ...formGroup, flex: 1, minWidth: 130 }}>
                <label style={lbl}>Date *</label>
                <input type="date" value={meetForm.date} onChange={e => setMeetForm(f => ({ ...f, date: e.target.value }))} style={inputSt} />
              </div>
              <div style={{ ...formGroup, flex: 1, minWidth: 110 }}>
                <label style={lbl}>Time *</label>
                <input type="time" value={meetForm.time} onChange={e => setMeetForm(f => ({ ...f, time: e.target.value }))} style={inputSt} />
              </div>
              <div style={{ ...formGroup, flex: 1, minWidth: 110 }}>
                <label style={lbl}>Duration</label>
                <select value={meetForm.durationMinutes} onChange={e => setMeetForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))} style={inputSt}>
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>

            {scheduleMsg.text && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                background: scheduleMsg.ok ? "#f0fdf4" : "#fef2f2",
                color: scheduleMsg.ok ? "#16a34a" : "#dc2626",
                fontSize: 13, fontWeight: 500,
                border: `1px solid ${scheduleMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              }}>
                {scheduleMsg.text}
              </div>
            )}

            <button onClick={scheduleMeeting} disabled={scheduling} style={{ ...primaryBtn, width: "100%", padding: "13px", fontSize: 14 }}>
              {scheduling ? "Scheduling..." : "📅 Schedule & Send Email Invites"}
            </button>
          </div>

          {/* Participant picker */}
          <div style={{ width: 260, flexShrink: 0 }}>
            <label style={lbl}>Add Participants</label>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>
              Email invites sent automatically. You're the organizer.
              {meetForm.participantIds.length > 0 && (
                <span style={{ color: "#2563eb", fontWeight: 600, marginLeft: 6 }}>
                  {meetForm.participantIds.length} selected
                </span>
              )}
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", maxHeight: 380, overflowY: "auto" }}>
              {users.map((u, i) => (
                <label key={u.userId} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderBottom: i < users.length - 1 ? "1px solid #f1f5f9" : "none",
                  background: meetForm.participantIds.includes(u.userId) ? "#eff6ff" : "white",
                }}>
                  <input type="checkbox" checked={meetForm.participantIds.includes(u.userId)} onChange={() => toggleParticipant(u.userId)} style={{ accentColor: "#2563eb" }} />
                  <StatusDot status={u.status} size={8} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{u.name || u.userId}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>{u.role} · {STATUS_LABEL[u.status] || "Available"}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MY MEETINGS ───────────────────────────────────── */}
      {tab === "My Meetings" && (
        <div>
          <button onClick={loadMyMeetings} style={{ ...primaryBtn, background: "#1e293b", marginBottom: 16 }}>↻ Refresh</button>
          {myMeetings.length === 0 ? (
            <Empty icon="📅" text="No meetings yet — schedule one in the Schedule Meeting tab." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {myMeetings.map(m => {
                const status = meetingStatus(m);
                const isOrganizer = m.createdBy === user?.userId;
                const canJoin = status === "ongoing" || status === "starting-soon";
                return (
                  <div key={m.meetingId} style={card}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <MeetStatusBadge status={status} />
                          {isOrganizer && <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 600 }}>You organized</span>}
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{m.title}</div>
                        {m.description && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{m.description}</div>}
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                          🗓 {new Date(m.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                          &nbsp;·&nbsp;⏱ {m.durationMinutes || 60} min
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
                          👥 {m.participants?.map(p => p.userName).join(", ")}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                        {canJoin && m.meetLink && (
                          <button onClick={() => window.open(m.meetLink, "_blank")} style={{ ...primaryBtn, background: status === "ongoing" ? "#16a34a" : "#d97706" }}>
                            {status === "ongoing" ? "Join Now" : "Join (Soon)"}
                          </button>
                        )}
                        {m.meetLink && (
                          <button
                            onClick={() => navigator.clipboard?.writeText(m.meetLink)}
                            style={{ ...primaryBtn, background: "#f1f5f9", color: "#475569", fontSize: 12 }}
                            title="Copy Google Meet link"
                          >
                            Copy Link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SUB COMPONENTS ────────────────────────────────────────

function MeetStatusBadge({ status }) {
  const styles = {
    upcoming:       { bg: "#f1f5f9", color: "#475569", label: "Upcoming" },
    "starting-soon": { bg: "#fef3c7", color: "#d97706", label: "Starting Soon" },
    ongoing:        { bg: "#dcfce7", color: "#16a34a", label: "Live Now" },
    ended:          { bg: "#f1f5f9", color: "#94a3b8", label: "Ended" },
  };
  const s = styles[status] || styles.upcoming;
  return <span style={{ background: s.bg, color: s.color, padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{s.label}</span>;
}

function Empty({ icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 20px", color: "#94a3b8" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────

const card = {
  background: "white", border: "1px solid #e2e8f0", borderRadius: 12,
  padding: "16px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const primaryBtn = {
  background: "#2563eb", color: "white", border: "none",
  borderRadius: 8, padding: "9px 20px", cursor: "pointer",
  fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
};

const searchInput = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 14, marginBottom: 16,
  boxSizing: "border-box", outline: "none",
};

const formGroup = { marginBottom: 16 };

const lbl = {
  display: "block", fontSize: 11, fontWeight: 700, color: "#374151",
  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em",
};

const inputSt = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #e2e8f0", fontSize: 14, color: "#0f172a",
  boxSizing: "border-box", outline: "none",
};
