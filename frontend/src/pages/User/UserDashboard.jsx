import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFileText, FiUser, FiList, FiCheckCircle } from "react-icons/fi";
import api from "../../config/apiClient";

const EXPECTED = 480; // 8 hrs in minutes

export default function UserDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");

  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!user?.userId) return;
    loadProgress();
    // refresh every 5 minutes
    const id = setInterval(loadProgress, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  async function loadProgress() {
    try {
      const res = await api.get("/user/today-progress", { params: { userId: user.userId } });
      if (res.data.ok) setProgress(res.data);
    } catch {}
  }

  const cards = [
    { title: "Assigned SDS Work",  desc: "Start your assigned SDS workflow tasks.", icon: <FiList size={28} />,        route: "/user/assigned-sds", color: "#2563eb" },
    { title: "Completed SDS",      desc: "View SDS tasks you have completed.",       icon: <FiCheckCircle size={28} />, route: "/user/completed-sds", color: "#16a34a" },
    { title: "DQ Assigned Work",   desc: "Access all assigned Data Queue files.",    icon: <FiFileText size={28} />,    route: "/user/dq/tasks", color: "#7c3aed" },
    { title: "DQ Completed",       desc: "View completed DQ tasks.",                 icon: <FiCheckCircle size={28} />, route: "/user/dq/completed", color: "#0891b2" },
    { title: "Batch Tasks",        desc: "Access your assigned batch records.",      icon: <FiList size={28} />,        route: "/user/batch/tasks", color: "#ea580c" },
    { title: "Profile",            desc: "View profile details &amp; logout.",       icon: <FiUser size={28} />,        route: "/user/profile", color: "#475569" },
  ];

  /* ── derived progress ── */
  const mins    = progress?.totalMinutes ?? 0;
  const pct     = Math.min(100, Math.round(mins / EXPECTED * 100));
  const remain  = Math.max(0, EXPECTED - mins);
  const isActive = progress?.isActive ?? false;
  const idleMin  = progress?.lastActivityAt
    ? Math.floor((Date.now() - progress.lastActivityAt) / 60000)
    : null;
  const isIdle   = idleMin !== null && idleMin >= 3;

  const barColor = pct >= 100 ? "#22c55e" : pct >= 75 ? "#3b82f6" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ padding: "24px 0" }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
        Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
      </h1>
      <p style={{ color: "#64748b", marginBottom: 24, fontSize: 14 }}>Quick access to your workflow tools</p>

      {/* ── Today's Progress Widget ── */}
      {progress !== null && (
        <div style={progressCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Today's Progress</div>
            <span style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              color: isActive && !isIdle ? "#16a34a" : isIdle ? "#d97706" : "#64748b",
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: isActive && !isIdle ? "#22c55e" : isIdle ? "#f59e0b" : "#94a3b8",
              }} />
              {isActive && !isIdle ? "Active" : isIdle ? `Idle ${idleMin}m` : "Offline"}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: "#0f172a", fontWeight: 600 }}>{fmtMins(mins)} worked</span>
              <span style={{ color: "#64748b" }}>{fmtMins(remain)} remaining</span>
            </div>
            <div style={{ height: 10, background: "#e2e8f0", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: barColor, borderRadius: 8, transition: "width 0.4s" }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Target: 8 hrs / day</span>
            <span style={{
              fontSize: 13, fontWeight: 700, padding: "3px 12px", borderRadius: 8,
              background: pct >= 100 ? "#dcfce7" : "#f1f5f9",
              color: pct >= 100 ? "#15803d" : "#0f172a",
            }}>
              {pct}%{pct >= 100 ? " ✓" : ""}
            </span>
          </div>
        </div>
      )}

      {/* ── Quick Action Cards ── */}
      <div style={grid}>
        {cards.map((card, i) => (
          <div key={i} style={{ ...cardBox, borderLeft: `5px solid ${card.color}` }} onClick={() => navigate(card.route)}>
            <div style={{ ...iconBox, background: card.color + "18" }}>
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <h3 style={{ margin: "8px 0 4px", fontSize: 15, fontWeight: 700 }}>{card.title}</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }} dangerouslySetInnerHTML={{ __html: card.desc }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function fmtMins(m) {
  const h = Math.floor(m / 60);
  const mn = Math.round(m % 60);
  return h > 0 ? `${h}h ${mn}m` : `${mn}m`;
}

const progressCard = {
  background: "#fff", borderRadius: 14, padding: "18px 22px",
  marginBottom: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  border: "1px solid #e2e8f0", maxWidth: 540,
};
const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};
const cardBox = {
  background: "#fff", padding: "18px", borderRadius: 12,
  cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.07)",
  border: "1px solid #e5e7eb",
};
const iconBox = {
  padding: "10px", borderRadius: "50%",
  width: 46, height: 46,
  display: "flex", alignItems: "center", justifyContent: "center",
  marginBottom: 6,
};
