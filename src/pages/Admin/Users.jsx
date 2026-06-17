import React, { useEffect, useState } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

export default function Users() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api
      .get("/users")
      .then((res) => {
        setUsers(res.data.users || []);
      })
      .catch((err) => {
        console.error("LOAD USERS ERROR:", err);
      });
  }, []);

  async function deleteUser(email) {
    if (!window.confirm(`Delete user ${email}?`)) return;

    try {
      await api.delete(`/users/${email}`);
      alert("User deleted");
      setUsers((prev) => prev.filter((u) => u.email !== email));
    } catch (err) {
      console.error("DELETE USER ERROR:", err);
      alert("Failed to delete user");
    }
  }

  return (
    <AdminLayout>
      <h1>Manage Users</h1>

      {users.length === 0 && <p>No users found.</p>}

      {users.map((user) => (
        <div key={user.email} style={card}>
          <h3>{user.name || user.email.split("@")[0]}</h3>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>

          <button style={btnDelete} onClick={() => deleteUser(user.email)}>
            Delete
          </button>
        </div>
      ))}
    </AdminLayout>
  );
}

/* STYLES */
const card = {
  padding: "12px",
  background: "#f8f8f8",
  borderRadius: "6px",
  marginBottom: "15px",
  border: "1px solid #ccc",
};

const btnDelete = {
  padding: "8px 12px",
  background: "red",
  color: "white",
  border: "none",
  cursor: "pointer",
  borderRadius: "4px",
};
