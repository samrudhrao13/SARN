import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

/* ================= AUTH ================= */
import Login from "./pages/Auth/Login";
import ResetPassword from "./pages/Auth/ResetPassword";

/* ================= ADMIN (SDS) ================= */
import Dashboard from "./pages/Admin/Dashboard";
import Assign from "./pages/Admin/Assign";
import Upload from "./pages/Admin/Upload";
import Workflow from "./pages/Admin/Workflow";
import References from "./pages/Admin/References";
import Database from "./pages/Admin/Database";
import WorkflowDetails from "./pages/Admin/WorkflowDetails";
import SDSBilling from "./pages/Admin/SDSBilling";

/* ================= ADMIN (DQ) ================= */
import DQDashboard from "./pages/AdminDQ/DQDashboard";
import DQUpload from "./pages/AdminDQ/DQUpload";
import DQList from "./pages/AdminDQ/DQList";
import DQAssign from "./pages/AdminDQ/DQAssign";
import DQWorkflow from "./pages/AdminDQ/DQWorkflow";
import DQReports from "./pages/AdminDQ/DQReports";
import DQBilling from "./pages/AdminDQ/DQBilling";
import DQDatabase from "./pages/AdminDQ/DQDatabase";
import DQView from "./pages/AdminDQ/DQView";

/* ================= ADMIN (BATCH) ================= */
import BatchDashboard from "./pages/AdminBatch/BatchDashboard";
import BatchUpload from "./pages/AdminBatch/BatchUpload";
import BatchAssign from "./pages/AdminBatch/BatchAssign";
import BatchBilling from "./pages/AdminBatch/BatchBilling";
import BatchReport from "./pages/AdminBatch/BatchReport";

/* ================= USER (SDS) ================= */
import UserDashboard from "./pages/User/UserDashboard";
import AssignedSDSWork from "./pages/User/AssignedSDSWork";
import WorkflowUserView from "./pages/User/WorkflowUserView";
import UserProfile from "./pages/User/UserProfile";
import CompletedSDSWork from "./pages/User/CompletedSDSWork";

/* ================= USER (DQ) ================= */
import AssignedDQWork from "./pages/UserDQ/AssignedDQWork";
import DQWorkForm from "./pages/UserDQ/DQWorkForm";

/* ================= USER (BATCH) ================= */
import BatchTasks from "./pages/UserBatch/BatchTasks";
import BatchWorkflow from "./pages/UserBatch/BatchWorkflow";
import BatchCompleted from "./pages/UserBatch/BatchCompleted";

/* ================= SUPER ADMIN ================= */
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import UserList from "./pages/SuperAdmin/UserList";
import AttendancePage from "./pages/SuperAdmin/AttendancePage";

/* ================= LAYOUTS ================= */
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import SuperAdminLayout from "./layouts/SuperAdminLayout";

/* ================= AUTH HELPERS ================= */

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("sarnUser") || "null");
  } catch {
    return null;
  }
};

const getRole = () => {
  const user = getUser();
  return (user?.role || localStorage.getItem("userRole") || "").toLowerCase();
};

/* ================= PROTECTED ROUTES ================= */

const ProtectedUser = ({ children }) => {
  const user = getUser();
  const role = getRole();

  if (!user) return <Navigate to="/login" replace />;

  if (["user", "dq_user", "admin"].includes(role)) return children;

  return <Navigate to="/login" replace />;
};

const ProtectedAdmin = ({ children }) => {
  const user = getUser();
  const role = getRole();

  if (!user) return <Navigate to="/login" replace />;

  if (role === "admin" || role === "superadmin") return children;

  return <Navigate to="/login" replace />;
};

const ProtectedSuperAdmin = ({ children }) => {
  const user = getUser();
  const role = getRole();

  if (!user) return <Navigate to="/login" replace />;

  if (role === "superadmin") return children;

  return <Navigate to="/login" replace />;
};

/* ================= ROLE REDIRECT ================= */

function RoleRedirect() {
  const user = getUser();
  const role = getRole();

  if (!user) return <Navigate to="/login" replace />;

  if (role === "superadmin") return <Navigate to="/super-admin" replace />;
  if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
  if (role === "user" || role === "dq_user")
    return <Navigate to="/user/dashboard" replace />;

  return <Navigate to="/login" replace />;
}

/* ================= ROUTES ================= */

export default function App() {
  return (
    <Routes>

      {/* ===== PUBLIC ===== */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* ===== SUPER ADMIN ===== */}
      <Route
        path="/super-admin"
        element={
          <ProtectedSuperAdmin>
            <SuperAdminLayout>
              <SuperAdminDashboard />
            </SuperAdminLayout>
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="/super-admin/users"
        element={
          <ProtectedSuperAdmin>
            <SuperAdminLayout>
              <UserList />
            </SuperAdminLayout>
          </ProtectedSuperAdmin>
        }
      />
      <Route
        path="/super-admin/attendance"
        element={
          <ProtectedSuperAdmin>
            <SuperAdminLayout>
              <AttendancePage />
            </SuperAdminLayout>
          </ProtectedSuperAdmin>
        }
      />

      {/* ===== ADMIN (SDS) ===== */}
      <Route path="/admin/dashboard" element={<ProtectedAdmin><AdminLayout><Dashboard /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/upload" element={<ProtectedAdmin><AdminLayout><Upload /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/assign" element={<ProtectedAdmin><AdminLayout><Assign /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/workflow" element={<ProtectedAdmin><AdminLayout><Workflow /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/database" element={<ProtectedAdmin><AdminLayout><Database /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/references" element={<ProtectedAdmin><AdminLayout><References /></AdminLayout></ProtectedAdmin>} />

      {/* ✅ SINGLE SOURCE OF TRUTH – ADMIN VIEW */}
      <Route
        path="/admin/workflow/view/:sheet/:referenceId"
        element={
          <ProtectedAdmin>
            <AdminLayout>
              <WorkflowDetails />
            </AdminLayout>
          </ProtectedAdmin>
        }
      />
      {/* ===== ADMIN (BATCH) ===== */}

        <Route
          path="/admin/batch/dashboard"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <BatchDashboard />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/batch/upload"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <BatchUpload />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/batch/assign"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <BatchAssign />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/batch/billing"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <BatchBilling />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

        <Route
          path="/admin/batch/report"
          element={
            <ProtectedAdmin>
              <AdminLayout>
                <BatchReport />
              </AdminLayout>
            </ProtectedAdmin>
          }
        />

      <Route path="/admin/sds/billing" element={<ProtectedAdmin><AdminLayout><SDSBilling /></AdminLayout></ProtectedAdmin>} />

      {/* ===== ADMIN (DQ) ===== */}
      <Route path="/admin/dq/dashboard" element={<ProtectedAdmin><AdminLayout><DQDashboard /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/upload" element={<ProtectedAdmin><AdminLayout><DQUpload /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/list" element={<ProtectedAdmin><AdminLayout><DQList /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/assign" element={<ProtectedAdmin><AdminLayout><DQAssign /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/workflow" element={<ProtectedAdmin><AdminLayout><DQWorkflow /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/reports" element={<ProtectedAdmin><AdminLayout><DQReports /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/billing" element={<ProtectedAdmin><AdminLayout><DQBilling /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/database" element={<ProtectedAdmin><AdminLayout><DQDatabase /></AdminLayout></ProtectedAdmin>} />
      <Route path="/admin/dq/view/:repoId" element={<ProtectedAdmin><AdminLayout><DQView /></AdminLayout></ProtectedAdmin>} />

      {/* ===== USER (SDS) ===== */}
      <Route path="/user/dashboard" element={<ProtectedUser><UserLayout><UserDashboard /></UserLayout></ProtectedUser>} />
      <Route path="/user/assigned-sds" element={<ProtectedUser><UserLayout><AssignedSDSWork /></UserLayout></ProtectedUser>} />
      <Route path="/user/profile" element={<ProtectedUser><UserLayout><UserProfile /></UserLayout></ProtectedUser>} />

      <Route
        path="/user/work/:sheet/:referenceId"
        element={
          <ProtectedUser>
            <UserLayout>
              <WorkflowUserView />
            </UserLayout>
          </ProtectedUser>
        }
      />
      <Route
        path="/user/completed-sds"
        element={
          <ProtectedUser>
            <UserLayout>
              <CompletedSDSWork />
            </UserLayout>
          </ProtectedUser>
        }
      />

      {/* ===== USER (DQ) ===== */}
      <Route path="/user/dq/tasks" element={<ProtectedUser><UserLayout><AssignedDQWork /></UserLayout></ProtectedUser>} />
      <Route path="/user/dq/work/:refId" element={<ProtectedUser><UserLayout><DQWorkForm /></UserLayout></ProtectedUser>} />

        {/* ===== USER (BATCH) ===== */}

        <Route
          path="/user/batch/tasks"
          element={
            <ProtectedUser>
              <UserLayout>
                <BatchTasks />
              </UserLayout>
            </ProtectedUser>
          }
        />

        <Route
          path="/user/batch/work/:sheet/:recordId"
          element={
            <ProtectedUser>
              <UserLayout>
                <BatchWorkflow />
              </UserLayout>
            </ProtectedUser>
          }
        />

        <Route
          path="/user/batch/completed"
          element={
            <ProtectedUser>
              <UserLayout>
                <BatchCompleted />
              </UserLayout>
            </ProtectedUser>
          }
        />
      {/* ===== FALLBACK ===== */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  );
}
