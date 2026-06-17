import React, { useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";

export default function DQProcess() {
  const [log, setLog] = useState([]);

  function push(msg) {
    setLog(prev => [...prev, msg]);
  }

  async function startProcessing() {
    push("Starting processing...");
    await new Promise(r => setTimeout(r, 500));

    push("Validating entries...");
    await new Promise(r => setTimeout(r, 500));

    push("Checking data normalization...");
    await new Promise(r => setTimeout(r, 500));

    push("Approving queues...");
    await new Promise(r => setTimeout(r, 500));

    push("Process Completed ✔");
  }

  return (
    <AdminLayout>
      <h1>Process Queue</h1>

      <button
        onClick={startProcessing}
        style={{
          background: "green",
          color: "white",
          padding: "10px 20px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Start Processing
      </button>

      <h3 style={{ marginTop: 20 }}>Logs:</h3>

      <div
        style={{
          background: "white",
          minHeight: "250px",
          padding: "15px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          overflowY: "auto",
        }}
      >
        {log.map((l, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            • {l}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
