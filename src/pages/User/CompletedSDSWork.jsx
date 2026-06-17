    import React, { useEffect, useState } from "react";
    import UserLayout from "../../layouts/UserLayout";
    import { useNavigate } from "react-router-dom";
    import api from "../../config/apiClient";
    

    /* ================= HELPERS ================= */

    const normalizeSheet = (s) =>
    String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

    const normalizeStage = (stage) => {
    if (!stage || stage === "pending") return "search";
    return stage;
    };

    /* ================= COMPONENT ================= */

    export default function CompletedSDSWork() {
    const navigate = useNavigate();

    const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
    const userId = user?.userId;

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stageFilter, setStageFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sheetFilter, setSheetFilter] = useState("");

    /* ================= LOAD TASKS ================= */
    useEffect(() => {
        if (!userId) return;

        async function loadTasks() {
        setLoading(true);
        try {
            const res = await api.get("/user/completed-sds-tasks", {
            params: {
                userId,
                page: 1,
                pageSize: 100,
            },
            });

            setTasks(res.data.ok ? res.data.tasks || [] : []);
        } catch (err) {
            console.error("LOAD SDS TASKS ERROR:", err);
            setTasks([]);
        } finally {
            setLoading(false);
        }
        }

        loadTasks();
    }, [userId]);
    const filteredTasks = tasks.filter((t) => {
    const stageMatch =
        !stageFilter ||
        (t.stage || t.currentStage) === stageFilter;

    const statusMatch =
        !statusFilter ||
        t.status === statusFilter;

    const sheetMatch =
        !sheetFilter ||
        t.sheet === sheetFilter;

    return stageMatch && statusMatch && sheetMatch;
    });

    /* ================= OPEN WORKFLOW ================= */
    function openWorkflow(task) {
        const sheet = normalizeSheet(task.sheet);
        const refId = encodeURIComponent(String(task.referenceId));

        navigate(`/user/work/${sheet}/${refId}`);
    }

    return (
        <UserLayout>
        <h1>Completed SDS Work</h1>
        <div
    style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "20px",
        flexWrap: "nowrap",
    }}
    >
    {/* Sheet */}
    <select
    style={filterInput}
    value={sheetFilter}
    onChange={(e) => setSheetFilter(e.target.value)}
    >
        <option value="">All Sheets</option>
        {[...new Set(tasks.map(t => t.sheet))].map(s => (
        <option key={s} value={s}>
            {s}
        </option>
        ))}
    </select>

    {/* Stage */}
    <select
    style={filterInput}
    value={stageFilter}
    onChange={(e) => setStageFilter(e.target.value)}
    >
        <option value="">All Stages</option>
        <option value="search">Search</option>
        <option value="supersede">Supersede</option>
        <option value="transcription">Transcription</option>
        <option value="billing">Billing</option>
    </select>

    {/* Status */}
    <select
    style={filterInput}
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    >
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="Waiting Response">Waiting Response</option>
        <option value="File available">File available</option>
        <option value="No file Found">No file Found</option>
        <option value="completed">Completed</option>
    </select>

    <button
        style={clearFilterBtn}
        onClick={() => {
        setSheetFilter("");
        setStageFilter("");
        setStatusFilter("");
        }}
    >
        Clear Filters
    </button>
    </div>

        {loading && <p>Loading...</p>}

        {!loading && filteredTasks.length === 0 && (
            <p>No tasks assigned.</p>
        )}

        {!loading && filteredTasks.length > 0 && (
            <table style={table}>
            <thead>
                <tr>
                <th style={th}>Reference ID</th>
                <th style={th}>Company</th>
                <th style={th}>Sheet</th>
                <th style={th}>Stage</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
                </tr>
            </thead>
            <tbody>
                {filteredTasks.map((t, i) => {
                const stage = normalizeStage(
                    t.stage || t.currentStage
                );

                return (
                    <tr key={i}>
                    <td style={td}>{t.referenceId}</td>
                    <td style={td}>{t.company || "SARN"}</td>
                    <td style={td}>{normalizeSheet(t.sheet)}</td>

                    <td style={td}>
                    <StageBadge stage={stage} />
                    </td>

                    <td style={td}>
                    <StatusBadge status={t.status} />
                    </td>

                    <td style={td}>
                    <button
                        style={btn}
                        onClick={() => openWorkflow(t)}
                    >
                        View
                    </button>
                    </td>
                </tr>
                );
                })}
            </tbody>
            </table>
        )}
        </UserLayout>
    );
    }

    /* ================= UI HELPERS ================= */

    function StageBadge({ stage }) {
    const colors = {
        search: "#c7d2fe",
        supersede: "#fde68a",
        transcription: "#fbcfe8",
        billing: "#93c5fd",
    };

    return (
        <span
        style={{
            background: colors[stage] || "#e5e7eb",
            padding: "4px 12px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
        }}
        >
        {stage}
        </span>
    );
    }
    function StatusBadge({ status }) {
    const colors = {
        pending: "#facc15",
        "Waiting Response": "#fb923c",
        "File available": "#22c55e",
        "No file Found": "#ef4444",
        completed: "#16a34a",
    };

    return (
        <span
        style={{
            background: colors[status] || "#e5e7eb",
            padding: "4px 12px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 12,
        }}
        >
        {status || "pending"}
        </span>
    );
    }

    /* ================= STYLES ================= */

    const table = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: 20,
    };

    const th = {
    padding: 10,
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
    textAlign: "left",
    };

    const td = {
    padding: 10,
    border: "1px solid #e5e7eb",
    };

    const btn = {
    padding: "6px 14px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    };

    const filterInput = {
    width: "220px",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    };

    const clearFilterBtn = {
    padding: "8px 14px",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    };