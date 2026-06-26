import React, { useState, useRef } from "react";

const SDS_SCANNER_URL = "http://localhost:5050";

const GHS_ALL = [
  "GHS01 — Exploding Bomb",
  "GHS02 — Flame",
  "GHS03 — Flame Over Circle (Oxidizer)",
  "GHS04 — Compressed Gas",
  "GHS05 — Corrosion",
  "GHS06 — Skull and Crossbones (Toxic)",
  "GHS07 — Exclamation Mark (Harmful/Irritant)",
  "GHS08 — Health Hazard (Serious)",
  "GHS09 — Environmental Hazard",
];

export default function SDSScanner() {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const [copied, setCopied]     = useState(false);
  const inputRef                = useRef(null);

  function handleFile(f) {
    if (!f || !f.name.toLowerCase().endsWith(".pdf")) return;
    setFile(f);
    setResult(null);
    setError(null);
  }

  async function handleScan() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const fd = new FormData();
    fd.append("pdf", file);

    try {
      const res  = await fetch(`${SDS_SCANNER_URL}/scan`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Scan failed");
      setResult(data);
    } catch (err) {
      if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
        setError("SDS Scanner service is not running. Start it with: cd sds-scanner && python app.py");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function copyText() {
    if (!result) return;
    const f = result.fields || {};
    const comp = (f.composition || [])
      .map(c => `    - ${c.name || "?"}  |  CAS: ${c.cas || "?"}  |  ${c.percentage || "?"}`)
      .join("\n");

    const text = `=== SDS EXTRACTED FIELDS ===
File: ${result.filename}
Pages: ${result.page_count}  |  Text chars: ${result.text_chars}  |  ${result.is_scanned ? "SCANNED PDF" : "Text PDF"}

Manufacturer:   ${f.manufacturer_name || "—"}
City:           ${f.city || "—"}
State:          ${f.state || "—"}
Zip:            ${f.zip || "—"}
Email:          ${f.email || "—"}
Contact:        ${f.contact || "—"}
Emergency:      ${f.emergency || "—"}

GHS Pictograms (Section 2 & 14):
${(f.ghs_pictograms || []).map(g => "  - " + g).join("\n") || "  —"}

Chemical Name:  ${f.chemical_name || "—"}
Product No.:    ${f.product_number || "—"}
Trade Names:    ${(f.trade_names || []).join(", ") || "—"}

Composition / Ingredients (Section 3):
${comp || "  —"}

VOC Content:    ${f.voc_content || "—"}
Solid Content:  ${f.solid_content || "—"}

--- OpenCV Pictogram Detection ---
Mode:    ${result.opencv?.mode || "—"}
Count:   ${result.opencv?.count ?? 0} diamond shape(s) detected
${(result.opencv?.identified || []).map(d => `  ${d.id} — ${d.label}`).join("\n") || "  No template matches"}
`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const f = result?.fields || {};
  const cv = result?.opencv || {};

  return (
    <div style={{ padding: "20px", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>SDS Scanner</h2>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 13 }}>
          Upload an SDS / MSDS PDF — Groq AI extracts template fields · OpenCV detects GHS pictograms
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${file ? "#2563eb" : "#cbd5e1"}`,
          borderRadius: 10,
          padding: "32px 20px",
          textAlign: "center",
          cursor: "pointer",
          background: file ? "#eff6ff" : "#fff",
          marginBottom: 16,
          transition: "all .2s",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
        {file
          ? <div style={{ fontWeight: 700, color: "#2563eb" }}>{file.name}</div>
          : <div style={{ fontWeight: 600, color: "#475569" }}>Drop PDF here or click to browse</div>
        }
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>PDF files only · max 50 MB</div>
      </div>

      <button
        onClick={handleScan}
        disabled={!file || loading}
        style={{
          padding: "10px 28px",
          background: !file || loading ? "#94a3b8" : "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 14,
          cursor: !file || loading ? "not-allowed" : "pointer",
          marginBottom: 24,
        }}
      >
        {loading ? "Scanning…" : "Scan PDF"}
      </button>

      {/* Error */}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "14px 18px", color: "#991b1b", fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Info strip */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
            <Chip>{result.filename}</Chip>
            <Chip>{result.page_count} page{result.page_count !== 1 ? "s" : ""}</Chip>
            <Chip>{result.text_chars.toLocaleString()} chars</Chip>
            <span style={{
              padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: result.is_scanned ? "#fef3c7" : "#dcfce7",
              color: result.is_scanned ? "#b45309" : "#15803d",
            }}>
              {result.is_scanned ? "⚠ Scanned PDF" : "✓ Text PDF"}
            </span>
            <button onClick={copyText} style={{ marginLeft: "auto", padding: "6px 16px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {copied ? "Copied!" : "Copy All"}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

            {/* ── Left: Groq fields ── */}
            <div style={panel}>
              <div style={{ ...panelHead, background: "#f0fdf4", color: "#15803d" }}>
                Groq LLaMA — Extracted Fields
              </div>
              <div style={{ padding: 18 }}>
                {f.error
                  ? <div style={{ color: "#991b1b", fontSize: 13, background: "#fef2f2", padding: 12, borderRadius: 6 }}>{f.error}</div>
                  : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <tbody>
                        <FieldRow label="Manufacturer"  value={f.manufacturer_name} />
                        <FieldRow label="City"          value={f.city} />
                        <FieldRow label="State"         value={f.state} />
                        <FieldRow label="Zip"           value={f.zip} />
                        <FieldRow label="Email"         value={f.email} />
                        <FieldRow label="Contact"       value={f.contact} />
                        <FieldRow label="Emergency"     value={f.emergency} />
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={labelCell}>GHS Pictograms</td>
                          <td style={{ padding: "8px 6px" }}>
                            {(f.ghs_pictograms || []).length > 0
                              ? (f.ghs_pictograms || []).map((g, i) => (
                                  <span key={i} style={ghsTag}>{g}</span>
                                ))
                              : <span style={nullStyle}>—</span>
                            }
                          </td>
                        </tr>
                        <FieldRow label="Chemical Name"  value={f.chemical_name} />
                        <FieldRow label="Product No."    value={f.product_number} />
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={labelCell}>Trade Names</td>
                          <td style={{ padding: "8px 6px" }}>
                            {(f.trade_names || []).length > 0
                              ? (f.trade_names || []).map((t, i) => (
                                  <span key={i} style={tradeTag}>{t}</span>
                                ))
                              : <span style={nullStyle}>—</span>
                            }
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ ...labelCell, verticalAlign: "top", paddingTop: 10 }}>Composition</td>
                          <td style={{ padding: "8px 6px" }}>
                            {(f.composition || []).length > 0
                              ? (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                  <thead>
                                    <tr style={{ background: "#f8fafc" }}>
                                      {["Name", "CAS No.", "%"].map(h => (
                                        <th key={h} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 700, color: "#475569", border: "1px solid #e2e8f0" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {f.composition.map((c, i) => (
                                      <tr key={i}>
                                        <td style={compCell}>{c.name || "—"}</td>
                                        <td style={compCell}>{c.cas  || "—"}</td>
                                        <td style={compCell}>{c.percentage || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )
                              : <span style={nullStyle}>—</span>
                            }
                          </td>
                        </tr>
                        <FieldRow label="VOC Content"   value={f.voc_content} />
                        <FieldRow label="Solid Content" value={f.solid_content} />
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>

            {/* ── Right: OpenCV ── */}
            <div style={panel}>
              <div style={{ ...panelHead, background: "#eff6ff", color: "#1d4ed8" }}>
                OpenCV — Pictogram Detection
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                  Mode: <strong>{cv.mode === "template_matching" ? "Template Matching" : "Shape Detection Only"}</strong>
                  &nbsp;·&nbsp;Diamonds found: <strong>{cv.count ?? 0}</strong>
                </div>

                {(cv.identified || []).length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Identified:</div>
                    {cv.identified.map((d, i) => (
                      <span key={i} style={ghsTag}>{d.id} — {d.label}</span>
                    ))}
                  </div>
                )}

                {(cv.detections || []).length > 0
                  ? (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>All Detections:</div>
                      {cv.detections.map((d, i) => (
                        <div key={i} style={{ background: "#f8fafc", borderRadius: 6, padding: "8px 12px", marginBottom: 6, fontSize: 12 }}>
                          <div style={{ fontWeight: 700 }}>Page {d.page}</div>
                          <div style={{ color: "#64748b" }}>{d.position}</div>
                          {d.label
                            ? <><div style={{ color: "#15803d", fontWeight: 700 }}>{d.ghs_id} — {d.label}</div>
                                <div style={{ color: "#64748b" }}>Confidence: {d.confidence}</div></>
                            : <div style={{ color: "#94a3b8", fontSize: 11 }}>Shape detected — no template match</div>
                          }
                        </div>
                      ))}
                    </>
                  )
                  : <div style={{ color: "#94a3b8", fontSize: 13 }}>No GHS diamond shapes detected.</div>
                }

                {cv.template_tip && (
                  <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 6, padding: "10px 14px", fontSize: 12, color: "#92400e", marginTop: 14 }}>
                    <strong>Tip:</strong> Place GHS reference images (ghs01.png … ghs09.png) in the{" "}
                    <code style={{ background: "#fde68a", padding: "1px 4px", borderRadius: 3 }}>sds-scanner/ghs_templates/</code>{" "}
                    folder to enable full pictogram identification.
                  </div>
                )}

                {/* Reference list */}
                <div style={{ marginTop: 18, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>9 Standard GHS Pictograms:</div>
                  {GHS_ALL.map((g, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#64748b", padding: "2px 0" }}>{g}</div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}

/* ── Sub-components ── */

function Chip({ children }) {
  return (
    <span style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#334155" }}>
      {children}
    </span>
  );
}

function FieldRow({ label, value }) {
  return (
    <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
      <td style={labelCell}>{label}</td>
      <td style={{ padding: "8px 6px", color: value ? "#0f172a" : "#cbd5e1", fontStyle: value ? "normal" : "italic" }}>
        {value || "—"}
      </td>
    </tr>
  );
}

/* ── Styles ── */

const panel     = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflow: "hidden" };
const panelHead = { padding: "12px 18px", fontSize: 13, fontWeight: 700, borderBottom: "1px solid #e2e8f0" };
const labelCell = { padding: "8px 6px", fontWeight: 600, color: "#475569", width: "35%", whiteSpace: "nowrap", fontSize: 12 };
const nullStyle = { color: "#cbd5e1", fontStyle: "italic" };
const compCell  = { padding: "4px 6px", border: "1px solid #f1f5f9", color: "#0f172a" };
const ghsTag    = { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#fef3c7", color: "#b45309", margin: "2px 2px 2px 0" };
const tradeTag  = { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "#ede9fe", color: "#6d28d9", margin: "2px 2px 2px 0" };
