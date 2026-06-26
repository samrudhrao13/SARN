import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PRESET_THRESHOLDS = [25, 50, 75, 90, 100];

export default function Notifications() {
  const [settings, setSettings] = useState({
    senderEmail: "",
    recipientEmails: [],
    thresholds: [75],
    enabled: false,
    hasPassword: false,
    lastChecked: null,
    lastSent: null,
    notifiedMap: {},
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [customPct, setCustomPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success"|"error", text }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await api.get("/admin/notification-settings");
      if (res.data.ok) setSettings(res.data.settings);
    } catch (e) {
      flash("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        senderEmail: settings.senderEmail,
        recipientEmails: settings.recipientEmails,
        thresholds: settings.thresholds,
        enabled: settings.enabled,
      };
      if (password) payload.senderPassword = password;
      const res = await api.post("/admin/notification-settings", payload);
      if (res.data.ok) {
        flash("success", "Settings saved successfully");
        setPassword("");
        fetchSettings();
      } else {
        flash("error", res.data.error || "Save failed");
      }
    } catch (e) {
      flash("error", "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    try {
      const res = await api.post("/admin/trigger-notifications", { forceAll: false });
      if (res.data.ok) {
        if (res.data.sent) {
          flash("success", `Email sent! ${res.data.count} sheet(s) to ${res.data.recipients} recipient(s)`);
        } else {
          flash("success", res.data.reason || "No thresholds crossed — no email sent");
        }
        fetchSettings();
      } else {
        flash("error", res.data.error || "Check failed");
      }
    } catch (e) {
      flash("error", "Check failed");
    } finally {
      setChecking(false);
    }
  }

  async function handleSendNow() {
    setSending(true);
    try {
      const res = await api.post("/admin/trigger-notifications", { forceAll: true });
      if (res.data.ok && res.data.sent) {
        flash("success", `Report sent to ${res.data.recipients} recipient(s)`);
        fetchSettings();
      } else {
        flash("error", res.data.error || "Send failed");
      }
    } catch (e) {
      flash("error", "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await api.post("/admin/reset-notification-map");
      if (res.data.ok) {
        flash("success", "Notification history cleared — all thresholds will re-trigger");
        fetchSettings();
      }
    } catch (e) {
      flash("error", "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e || !e.includes("@")) return flash("error", "Enter a valid email");
    if (settings.recipientEmails.includes(e)) return flash("error", "Email already added");
    setSettings(s => ({ ...s, recipientEmails: [...s.recipientEmails, e] }));
    setNewEmail("");
  }

  function removeEmail(email) {
    setSettings(s => ({ ...s, recipientEmails: s.recipientEmails.filter(e => e !== email) }));
  }

  function toggleThreshold(pct) {
    setSettings(s => ({
      ...s,
      thresholds: s.thresholds.includes(pct)
        ? s.thresholds.filter(t => t !== pct)
        : [...s.thresholds, pct].sort((a, b) => a - b),
    }));
  }

  function addCustomThreshold() {
    const n = parseInt(customPct, 10);
    if (isNaN(n) || n <= 0 || n > 100) return flash("error", "Enter a % between 1 and 100");
    if (settings.thresholds.includes(n)) return flash("error", "Threshold already added");
    setSettings(s => ({ ...s, thresholds: [...s.thresholds, n].sort((a, b) => a - b) }));
    setCustomPct("");
  }

  const notifiedCount = Object.keys(settings.notifiedMap || {}).length;

  if (loading) return <div style={{ padding: 40, color: "#64748b" }}>Loading...</div>;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 820, fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Email Notifications</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Auto-send progress reports when sheets cross completion thresholds
        </p>
      </div>

      {/* Flash message */}
      {msg && (
        <div style={{
          padding: "10px 16px", borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 600,
          background: msg.type === "success" ? "#f0fdf4" : "#fef2f2",
          color: msg.type === "success" ? "#16a34a" : "#dc2626",
          border: `1px solid ${msg.type === "success" ? "#bbf7d0" : "#fecaca"}`,
        }}>{msg.text}</div>
      )}

      {/* Enable toggle */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Automated Notifications</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            Auto-check and send when thresholds are crossed
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <div
            onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
            style={{
              width: 44, height: 24, borderRadius: 12, cursor: "pointer", transition: "background 0.2s",
              background: settings.enabled ? "#3b82f6" : "#cbd5e1", position: "relative",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3, left: settings.enabled ? 23 : 3, transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: settings.enabled ? "#3b82f6" : "#94a3b8" }}>
            {settings.enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
      </div>

      {/* Sender Configuration */}
      <Section title="Sender Configuration" subtitle="Company Gmail account used to send reports">
        <label style={labelStyle}>Sender Gmail Address</label>
        <input
          type="email"
          value={settings.senderEmail}
          onChange={e => setSettings(s => ({ ...s, senderEmail: e.target.value }))}
          placeholder="company@gmail.com"
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 12 }}>
          Gmail App Password
          {settings.hasPassword && !password && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>
              Saved
            </span>
          )}
        </label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={settings.hasPassword ? "Leave blank to keep existing" : "Enter 16-char app password"}
            style={{ ...inputStyle, paddingRight: 72 }}
          />
          <button
            onClick={() => setShowPassword(v => !v)}
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
          Gmail &rarr; My Account &rarr; Security &rarr; App Passwords (requires 2FA enabled)
        </div>
      </Section>

      {/* Recipients */}
      <Section title="Recipients" subtitle="Email addresses that will receive the progress reports">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addEmail()}
            placeholder="Add recipient email..."
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          />
          <button onClick={addEmail} style={primaryBtn}>Add</button>
        </div>
        {settings.recipientEmails.length === 0 ? (
          <div style={{ fontSize: 13, color: "#94a3b8", padding: "8px 0" }}>No recipients added yet</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {settings.recipientEmails.map(email => (
              <div key={email} style={{
                display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9",
                border: "1px solid #e2e8f0", borderRadius: 20, padding: "4px 12px", fontSize: 13,
              }}>
                <span style={{ color: "#0f172a" }}>{email}</span>
                <button
                  onClick={() => removeEmail(email)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: 14, lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Thresholds */}
      <Section title="Completion Thresholds" subtitle="Send email when a sheet reaches these completion percentages">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {PRESET_THRESHOLDS.map(pct => {
            const active = settings.thresholds.includes(pct);
            return (
              <button
                key={pct}
                onClick={() => toggleThreshold(pct)}
                style={{
                  padding: "6px 16px", borderRadius: 20, border: `2px solid ${active ? "#3b82f6" : "#e2e8f0"}`,
                  background: active ? "#eff6ff" : "#f8fafc", color: active ? "#3b82f6" : "#64748b",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                {pct}%
              </button>
            );
          })}
        </div>
        {/* Custom threshold */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="number"
            min={1} max={100}
            value={customPct}
            onChange={e => setCustomPct(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomThreshold()}
            placeholder="Custom %"
            style={{ ...inputStyle, width: 100, marginBottom: 0 }}
          />
          <button onClick={addCustomThreshold} style={primaryBtn}>Add</button>
        </div>
        {/* Active thresholds */}
        {settings.thresholds.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {settings.thresholds.map(t => (
              <div key={t} style={{
                display: "flex", alignItems: "center", gap: 4, background: "#3b82f6",
                color: "white", borderRadius: 14, padding: "3px 10px", fontSize: 12, fontWeight: 700,
              }}>
                {t}%
                <button
                  onClick={() => setSettings(s => ({ ...s, thresholds: s.thresholds.filter(x => x !== t) }))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0, fontSize: 13, lineHeight: 1, marginLeft: 2 }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
          Each threshold fires once per sheet. Use "Reset History" to re-trigger.
        </div>
      </Section>

      {/* Save */}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, fontSize: 14, padding: "10px 24px" }}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Actions */}
      <Section title="Actions" subtitle="Manually trigger email notifications">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <ActionCard
            title="Check Thresholds"
            desc="Check all sheets — send email only for newly crossed thresholds"
            btnLabel={checking ? "Checking..." : "Check & Send"}
            btnColor="#3b82f6"
            disabled={checking || sending}
            onClick={handleCheck}
          />
          <ActionCard
            title="Send Full Report Now"
            desc="Send a complete progress report for all sheets regardless of thresholds"
            btnLabel={sending ? "Sending..." : "Send Now"}
            btnColor="#7c3aed"
            disabled={checking || sending}
            onClick={handleSendNow}
          />
          <ActionCard
            title="Reset Notification History"
            desc={`Clear ${notifiedCount} stored notification(s) so thresholds can re-trigger`}
            btnLabel={resetting ? "Resetting..." : "Reset History"}
            btnColor="#dc2626"
            disabled={resetting || notifiedCount === 0}
            onClick={handleReset}
          />
        </div>
      </Section>

      {/* Status */}
      <Section title="Status" subtitle="Last activity">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <StatusBadge label="Last Checked" value={settings.lastChecked ? new Date(settings.lastChecked).toLocaleString("en-IN") : "Never"} />
          <StatusBadge label="Last Email Sent" value={settings.lastSent ? new Date(settings.lastSent).toLocaleString("en-IN") : "Never"} />
          <StatusBadge label="Notified Threshold(s)" value={`${notifiedCount} stored`} />
        </div>
      </Section>
    </div>
  );
}

/* ── Sub-components ── */

function Section({ title, subtitle, children }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function ActionCard({ title, desc, btnLabel, btnColor, disabled, onClick }) {
  return (
    <div style={{
      flex: "1 1 220px", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{desc}</div>
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          background: disabled ? "#e2e8f0" : btnColor, color: disabled ? "#94a3b8" : "white",
          border: "none", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 13,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        {btnLabel}
      </button>
    </div>
  );
}

function StatusBadge({ label, value }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", minWidth: 160 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

/* ── Styles ── */

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 };

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
  fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", marginBottom: 0,
};

const primaryBtn = {
  background: "#3b82f6", color: "white", border: "none", borderRadius: 8,
  padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
};
