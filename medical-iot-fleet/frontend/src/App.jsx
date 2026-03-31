import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import FloorView from "./pages/FloorView";
import DeviceDetail from "./pages/DeviceDetail";
import AuditLogs from "./pages/AuditLogs";
import Alerts from "./pages/Alerts";
import ApiManager from "./pages/ApiManager";
import UserManagement from "./pages/UserManagement";
import AuthSuccess from "./pages/AuthSuccess";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/common/ProtectedRoute";
import Layout from "./components/common/layout";

export default function App() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/auth/success" element={<AuthSuccess />} />

            {/* Protected — wrapped in sidebar layout */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/floors" element={<FloorView />} />
                <Route path="/devices/:deviceId" element={<DeviceDetail />} />
                <Route path="/logs" element={<AuditLogs />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/api-manager" element={<ApiManager />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}
