import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PRESET_THRESHOLDS = [25, 50, 75, 90, 100];

export default function Notifications() {
  const [settings, setSettings] = useState({
    senderEmail: "",
    recipientEmails: [],
    thresholds: [75],
    enabled: false,
    authMethod: "oauth2",
    hasPassword: false,
    hasOAuth: false,
    lastChecked: null,
    lastSent: null,
    notifiedMap: {},
  });

  // OAuth2 fields (write-only — never returned from backend)
  const [oauth, setOauth] = useState({ clientId: "", clientSecret: "", refreshToken: "" });
  // App password (write-only)
  const [password, setPassword] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);

  // Sender config lock
  const [senderUnlocked, setSenderUnlocked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [customPct, setCustomPct] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSettings(); }, []);

  async function fetchSettings() {
    try {
      const res = await api.get("/admin/notification-settings");
      if (res.data.ok) setSettings(res.data.settings);
    } catch {
      flash("error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  function flash(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        senderEmail: settings.senderEmail,
        recipientEmails: settings.recipientEmails,
        thresholds: settings.thresholds,
        enabled: settings.enabled,
        authMethod: settings.authMethod,
      };
      if (settings.authMethod === "oauth2") {
        if (oauth.clientId)     payload.oauthClientId     = oauth.clientId;
        if (oauth.clientSecret) payload.oauthClientSecret = oauth.clientSecret;
        if (oauth.refreshToken) payload.oauthRefreshToken = oauth.refreshToken;
      } else {
        if (password) payload.senderPassword = password;
      }
      const res = await api.post("/admin/notification-settings", payload);
      if (res.data.ok) {
        flash("success", "Settings saved");
        setPassword("");
        setOauth({ clientId: "", clientSecret: "", refreshToken: "" });
        fetchSettings();
      } else {
        flash("error", res.data.error || "Save failed");
      }
    } catch {
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
        flash(res.data.sent ? "success" : "success",
          res.data.sent
            ? `Email sent — ${res.data.count} sheet(s) to ${res.data.recipients} recipient(s)`
            : (res.data.reason || "No new thresholds crossed"));
        fetchSettings();
      } else {
        flash("error", res.data.error || "Check failed");
      }
    } catch {
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
        flash("success", `Full report sent to ${res.data.recipients} recipient(s)`);
        fetchSettings();
      } else {
        flash("error", res.data.error || "Send failed");
      }
    } catch {
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
        flash("success", "History cleared — all thresholds can re-trigger");
        fetchSettings();
      }
    } catch {
      flash("error", "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  function addEmail() {
    const e = newEmail.trim().toLowerCase();
    if (!e.includes("@")) return flash("error", "Enter a valid email");
    if (settings.recipientEmails.includes(e)) return flash("error", "Already added");
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
    if (isNaN(n) || n <= 0 || n > 100) return flash("error", "Enter 1–100");
    if (settings.thresholds.includes(n)) return flash("error", "Already added");
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
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>Auto-check and send when thresholds are crossed</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
        </div>
      </div>

      {/* Warning modal */}
      {showWarning && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 420, width: "90%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ fontSize: 28 }}>⚠️</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>Warning</div>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
              Changes made to <strong>Sender Configuration</strong> will directly affect automated email sending.
              Incorrect credentials will stop all notifications from working.
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 13, color: "#dc2626", fontWeight: 600 }}>
              Only continue if you intend to update the sender credentials.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowWarning(false)}
                style={{ padding: "9px 20px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowWarning(false); setSenderUnlocked(true); }}
                style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                OK, Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sender Configuration */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
        {/* Header — always visible */}
        <div
          onClick={() => senderUnlocked ? setSenderUnlocked(false) : setShowWarning(true)}
          style={{
            padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center",
            cursor: "pointer", userSelect: "none",
            background: senderUnlocked ? "#fff" : "#f8fafc",
            borderBottom: senderUnlocked ? "1px solid #e2e8f0" : "none",
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Sender Configuration</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {senderUnlocked
                ? "Editing sender credentials — save when done"
                : settings.senderEmail
                  ? `Sending from: ${settings.senderEmail} · click to edit`
                  : "Gmail account used to send reports · click to configure"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {settings.senderEmail && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 10,
                background: settings.hasOAuth || settings.hasPassword ? "#dcfce7" : "#fef3c7",
                color: settings.hasOAuth || settings.hasPassword ? "#16a34a" : "#d97706",
              }}>
                {settings.hasOAuth ? "OAuth2 ✓" : settings.hasPassword ? "App Password ✓" : "No auth"}
              </span>
            )}
            <span style={{ fontSize: 18, color: "#94a3b8", transform: senderUnlocked ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
          </div>
        </div>

        {/* Body — only shown when unlocked */}
        {senderUnlocked && (
        <div style={{ padding: "18px 20px" }}>
        <label style={labelStyle}>Sender Gmail Address</label>
        <input
          type="email"
          value={settings.senderEmail}
          onChange={e => setSettings(s => ({ ...s, senderEmail: e.target.value }))}
          placeholder="company@gmail.com"
          style={{ ...inputStyle, marginBottom: 16 }}
        />

        {/* Auth Method toggle */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Authentication Method</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["oauth2", "Gmail API (OAuth2)", "Recommended — no password needed"],
              ["password", "App Password", "Simpler but requires 2FA + app password"]].map(([val, label, desc]) => (
              <div
                key={val}
                onClick={() => setSettings(s => ({ ...s, authMethod: val }))}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                  border: `2px solid ${settings.authMethod === val ? "#3b82f6" : "#e2e8f0"}`,
                  background: settings.authMethod === val ? "#eff6ff" : "#f8fafc",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 13, color: settings.authMethod === val ? "#3b82f6" : "#0f172a" }}>{label}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {settings.authMethod === "oauth2" ? (
          <div>
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1d4ed8" }}>
              <strong>Setup:</strong> Google Cloud Console → Enable Gmail API → Create OAuth2 credentials →
              visit <strong>OAuth Playground</strong> → authorize <code>https://mail.google.com/</code> →
              get Refresh Token. One-time setup, no password ever needed.
            </div>
            {[
              ["Client ID", "oauthClientId", "From Google Cloud Console → OAuth2 Credentials"],
              ["Client Secret", "oauthClientSecret", "From Google Cloud Console → OAuth2 Credentials"],
              ["Refresh Token", "oauthRefreshToken", "From OAuth Playground after authorizing Gmail scope"],
            ].map(([label, key, hint]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={labelStyle}>
                  {label}
                  {settings.hasOAuth && !oauth[key.replace("oauth", "").replace(/^./, c => c.toLowerCase())] && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>Saved</span>
                  )}
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showSecrets ? "text" : "password"}
                    value={oauth[key.replace("oauth", "").replace(/^./, c => c.toLowerCase())] || ""}
                    onChange={e => setOauth(o => ({ ...o, [key.replace("oauth", "").replace(/^./, c => c.toLowerCase())]: e.target.value }))}
                    placeholder={settings.hasOAuth ? "Leave blank to keep saved value" : hint}
                    style={{ ...inputStyle, paddingRight: 60 }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setShowSecrets(v => !v)}
              style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 12px", fontSize: 12, cursor: "pointer", color: "#64748b" }}
            >
              {showSecrets ? "Hide values" : "Show values"}
            </button>
          </div>
        ) : (
          <div>
            <label style={labelStyle}>
              App Password
              {settings.hasPassword && !password && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 10 }}>Saved</span>
              )}
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showSecrets ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={settings.hasPassword ? "Leave blank to keep existing" : "16-char app password from Google"}
                style={{ ...inputStyle, paddingRight: 72 }}
              />
              <button
                onClick={() => setShowSecrets(v => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
              >
                {showSecrets ? "Hide" : "Show"}
              </button>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>
              Gmail → My Account → Security → 2-Step Verification → App Passwords
            </div>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Recipients */}
      <Section title="Recipients" subtitle="Who receives the progress report emails">
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addEmail()}
            placeholder="Add recipient email..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addEmail} style={primaryBtn}>Add</button>
        </div>
        {settings.recipientEmails.length === 0
          ? <div style={{ fontSize: 13, color: "#94a3b8" }}>No recipients added yet</div>
          : <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {settings.recipientEmails.map(email => (
                <div key={email} style={{ display: "flex", alignItems: "center", gap: 6, background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 20, padding: "4px 12px", fontSize: 13 }}>
                  <span style={{ color: "#0f172a" }}>{email}</span>
                  <button onClick={() => removeEmail(email)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: 0, fontSize: 14 }}>&times;</button>
                </div>
              ))}
            </div>
        }
      </Section>

      {/* Thresholds */}
      <Section title="Completion Thresholds" subtitle="Email fires when a sheet reaches these percentages (once per threshold per sheet)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
          {PRESET_THRESHOLDS.map(pct => {
            const active = settings.thresholds.includes(pct);
            return (
              <button key={pct} onClick={() => toggleThreshold(pct)} style={{
                padding: "6px 16px", borderRadius: 20,
                border: `2px solid ${active ? "#3b82f6" : "#e2e8f0"}`,
                background: active ? "#eff6ff" : "#f8fafc",
                color: active ? "#3b82f6" : "#64748b",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}>{pct}%</button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <input
            type="number" min={1} max={100}
            value={customPct}
            onChange={e => setCustomPct(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCustomThreshold()}
            placeholder="Custom %"
            style={{ ...inputStyle, width: 110 }}
          />
          <button onClick={addCustomThreshold} style={primaryBtn}>Add</button>
        </div>
        {settings.thresholds.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {settings.thresholds.map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 4, background: "#3b82f6", color: "white", borderRadius: 14, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                {t}%
                <button onClick={() => setSettings(s => ({ ...s, thresholds: s.thresholds.filter(x => x !== t) }))}
                  style={{ background: "none", border: "none", color: "white", cursor: "pointer", padding: 0, fontSize: 13, marginLeft: 2 }}>&times;</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div style={{ marginBottom: 24 }}>
        <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, fontSize: 14, padding: "10px 28px" }}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Actions */}
      <Section title="Actions" subtitle="Manually trigger emails">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <ActionCard
            title="Check Thresholds"
            desc="Send email only for newly crossed thresholds"
            btnLabel={checking ? "Checking..." : "Check & Send"}
            btnColor="#3b82f6"
            disabled={checking || sending}
            onClick={handleCheck}
          />
          <ActionCard
            title="Send Full Report Now"
            desc="Send complete progress report for all sheets immediately"
            btnLabel={sending ? "Sending..." : "Send Now"}
            btnColor="#7c3aed"
            disabled={checking || sending}
            onClick={handleSendNow}
          />
          <ActionCard
            title="Reset History"
            desc={`Clear ${notifiedCount} stored notification(s) so thresholds re-trigger`}
            btnLabel={resetting ? "Resetting..." : "Reset History"}
            btnColor="#dc2626"
            disabled={resetting || notifiedCount === 0}
            onClick={handleReset}
          />
        </div>
      </Section>

      {/* Status */}
      <Section title="Status">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <StatusBadge label="Last Checked" value={settings.lastChecked ? new Date(settings.lastChecked).toLocaleString("en-IN") : "Never"} />
          <StatusBadge label="Last Email Sent" value={settings.lastSent ? new Date(settings.lastSent).toLocaleString("en-IN") : "Never"} />
          <StatusBadge label="Stored Notifications" value={`${notifiedCount} threshold(s) fired`} />
        </div>
      </Section>
    </div>
  );
}

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
    <div style={{ flex: "1 1 200px", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{title}</div>
      <div style={{ fontSize: 12, color: "#64748b", flex: 1 }}>{desc}</div>
      <button onClick={onClick} disabled={disabled} style={{
        background: disabled ? "#e2e8f0" : btnColor, color: disabled ? "#94a3b8" : "white",
        border: "none", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 13,
        cursor: disabled ? "not-allowed" : "pointer",
      }}>{btnLabel}</button>
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

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 };
const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" };
const primaryBtn = { background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" };
