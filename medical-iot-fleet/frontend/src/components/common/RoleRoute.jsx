import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function RoleRoute({ allowedRoles = [], children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-bg-main">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" replace />;
    if (!allowedRoles.length || allowedRoles.includes(user.role)) return children;
    return <Navigate to="/" replace />;
}

