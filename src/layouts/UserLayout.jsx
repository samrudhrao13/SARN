import React from "react";
import UserSidebar from "../components/UserSidebar";

export default function UserLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <UserSidebar />

      <div style={{ marginLeft: 160, padding: 20, width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
