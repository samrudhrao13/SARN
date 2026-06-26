import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

function getExitPath() {
  try {
    const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
    const role = (user?.role || localStorage.getItem("userRole") || "").toLowerCase();
    if (role === "superadmin") return "/super-admin/calls";
    if (role === "admin")      return "/admin/calls";
    return "/user/calls";
  } catch { return "/user/calls"; }
}

export default function CallRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const leftRef = useRef(false);

  const [meetLink, setMeetLink] = useState("");
  const [status, setStatus] = useState("loading"); // loading | joined | error
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!roomId || !user?.userId) return;

    async function init() {
      try {
        // Fetch the room to get the Google Meet link
        const r = await api.get(`/calls/room/${roomId}`);
        if (!r.data?.ok || !r.data?.room) {
          setErrMsg("Could not find the call room. The call may have ended.");
          setStatus("error");
          return;
        }
        const link = r.data.room.meetLink || "";
        setMeetLink(link);

        // Mark as joined
        await api.post("/calls/join", { roomId, userId: user.userId, userName: user.name || user.userId }).catch(() => {});

        // Open Google Meet in a new tab (only if link exists)
        if (link) window.open(link, "_blank");
        setStatus("joined");
      } catch (err) {
        setErrMsg("Could not connect to the call. Please try again.");
        setStatus("error");
      }
    }

    init();
  }, [roomId]);

  async function handleLeft() {
    if (leftRef.current) return;
    leftRef.current = true;
    if (user?.userId && roomId) {
      await api.post("/calls/leave", { roomId, userId: user.userId }).catch(() => {});
    }
    navigate(getExitPath());
  }

  if (status === "loading") {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📞</div>
          <div style={{ color: "#e2e8f0", fontSize: 16, fontWeight: 600 }}>Connecting to Google Meet...</div>
          <div style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>Opening your meeting in a new tab</div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={overlay}>
        <div style={card}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: "#f87171", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{errMsg}</div>
          <button onClick={() => navigate(getExitPath())} style={backBtn}>← Back to Calls</button>
        </div>
      </div>
    );
  }

  // status === "joined"
  return (
    <div style={overlay}>
      <div style={{ ...card, maxWidth: 480 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{meetLink ? "✅" : "⚠️"}</div>
        <div style={{ color: meetLink ? "#22c55e" : "#f59e0b", fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          {meetLink ? "Google Meet opened in a new tab" : "Google Meet not configured yet"}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 24 }}>
          {meetLink
            ? "Your call is running in the Google Meet tab. When you're done, come back here and click the button below."
            : "Domain-Wide Delegation is not set up yet. Complete the setup in Google Workspace Admin to enable Google Meet links."}
        </div>

        {meetLink && (
          <div style={{ background: "#1e293b", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: "#64748b", fontSize: 12, flexShrink: 0 }}>Meeting link:</span>
            <span style={{ color: "#60a5fa", fontSize: 12, wordBreak: "break-all", flex: 1 }}>{meetLink}</span>
            <button
              onClick={() => navigator.clipboard?.writeText(meetLink)}
              style={{ background: "#334155", border: "none", color: "#e2e8f0", padding: "4px 10px", borderRadius: 5, fontSize: 11, cursor: "pointer", flexShrink: 0 }}
            >
              Copy
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {meetLink && (
            <button
              onClick={() => window.open(meetLink, "_blank")}
              style={{ ...backBtn, background: "#2563eb" }}
            >
              🔗 Reopen Google Meet
            </button>
          )}
          <button onClick={handleLeft} style={{ ...backBtn, background: "#dc2626" }}>
            📵 I've Left the Call
          </button>
        </div>

        <div style={{ color: "#475569", fontSize: 11, marginTop: 16 }}>
          Clicking "I've Left the Call" updates your status and returns you to the Calls page.
        </div>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, background: "#0f172a",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 9999, padding: 20,
};

const card = {
  background: "#1e293b", borderRadius: 16, padding: "40px 32px",
  textAlign: "center", maxWidth: 420, width: "100%",
  border: "1px solid #334155",
};

const backBtn = {
  background: "#1e293b", border: "1px solid #334155",
  color: "white", padding: "10px 24px", borderRadius: 8,
  cursor: "pointer", fontSize: 14, fontWeight: 600,
};
