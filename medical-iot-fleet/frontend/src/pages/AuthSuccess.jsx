import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getMe } from "../api/authApi";

export default function AuthSuccess() {
    const [params] = useSearchParams();
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const token = params.get("token");
        if (!token) { navigate("/login"); return; }

        localStorage.setItem("token", token);
        getMe()
            .then((res) => { login(token, res.data); navigate("/"); })
            .catch(() => navigate("/login"));
    }, []);

    return (
        <div className="flex items-center justify-center h-screen bg-bg-main">
            <div className="text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-text-secondary">Signing you in...</p>
            </div>
        </div>
    );
}
