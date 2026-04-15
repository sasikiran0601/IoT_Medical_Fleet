import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import InviteRequiredPage from "./pages/InviteRequiredPage";
import Dashboard from "./pages/Dashboard";
import FloorView from "./pages/FloorView";
import DeviceDetail from "./pages/DeviceDetail";
import AuditLogs from "./pages/AuditLogs";
import Alerts from "./pages/Alerts";
import ApiManager from "./pages/ApiManager";
import UserManagement from "./pages/UserManagement";
import InviteManagement from "./pages/InviteManagement";
import AuthSuccess from "./pages/AuthSuccess";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import RoleRoute from "./components/common/RoleRoute";
import Layout from "./components/common/layout";
import { IS_PUBLIC_SIGNUP_DISABLED } from "./utils/env";

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route
                path="/register"
                element={!user ? (IS_PUBLIC_SIGNUP_DISABLED ? <InviteRequiredPage /> : <RegisterPage />) : <Navigate to="/" />}
            />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            <Route path="/auth/success" element={<AuthSuccess />} />

            {/* Protected — wrapped in sidebar layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/floors" element={<FloorView />} />
                <Route path="/devices/:deviceId" element={<DeviceDetail />} />
                <Route
                    path="/logs"
                    element={
                        <RoleRoute allowedRoles={["admin", "doctor", "nurse"]}>
                            <AuditLogs />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/alerts"
                    element={
                        <RoleRoute allowedRoles={["admin", "doctor", "nurse"]}>
                            <Alerts />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/api-manager"
                    element={
                        <RoleRoute allowedRoles={["admin"]}>
                            <ApiManager />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/users"
                    element={
                        <RoleRoute allowedRoles={["admin"]}>
                            <UserManagement />
                        </RoleRoute>
                    }
                />
                <Route
                    path="/invites"
                    element={
                        <RoleRoute allowedRoles={["admin"]}>
                            <InviteManagement />
                        </RoleRoute>
                    }
                />
                <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}
