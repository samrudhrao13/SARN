import React from "react";
import { useNavigate } from "react-router-dom";
import UserLayout from "../../layouts/UserLayout";
import { FiFileText, FiUser, FiList, FiCheckCircle } from "react-icons/fi";

export default function UserDashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Assigned SDS Work",
      desc: "Start your assigned SDS workflow tasks.",
      icon: <FiList size={32} />,
      route: "/user/assigned-sds",
    },
    {
      title: "Workflow View",
      desc: "Check progress of your SDS submissions.",
      icon: <FiFileText size={32} />,
      route: "/user/workflow-status",
    },
    {
      title: "Profile",
      desc: "View profile details & logout.",
      icon: <FiUser size={32} />,
      route: "/user/profile",
    },
    {
      title: "DQ Assigned Work",
      desc: "Access all assigned Data Queue files.",
      icon: <FiCheckCircle size={32} />,
      route: "/user/dq/tasks",
    },
  ];

  return (
    <UserLayout>
      <div style={container}>
        <h1 style={heading}>Welcome Back 👋</h1>
        <p style={subHeading}>Quick access to your workflow tools</p>

        <div style={grid}>
          {cards.map((card, i) => (
            <div
              key={i}
              style={cardBox}
              onClick={() => navigate(card.route)}
            >
              <div style={iconBox}>{card.icon}</div>
              <h3 style={cardTitle}>{card.title}</h3>
              <p style={cardDesc}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}

/* ================= STYLES ================= */

const container = { padding: "30px" };

const heading = {
  fontSize: 32,
  fontWeight: "bold",
  marginBottom: 10,
};

const subHeading = {
  fontSize: 16,
  color: "#555",
  marginBottom: 25,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "20px",
};

const cardBox = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
  cursor: "pointer",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
  border: "1px solid #e5e7eb",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
};

const cardTitle = {
  fontSize: 20,
  fontWeight: "600",
  marginBottom: "6px",
};

const cardDesc = {
  fontSize: 14,
  color: "#666",
};

const iconBox = {
  background: "#eef2ff",
  padding: "12px",
  borderRadius: "50%",
  width: "50px",
  height: "50px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: "10px",
};
