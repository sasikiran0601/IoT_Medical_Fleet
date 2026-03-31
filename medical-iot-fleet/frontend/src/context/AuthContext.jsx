import { createContext, useState, useEffect, useCallback } from "react";
import { getMe } from "../api/authApi";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    // Fetch current user whenever token changes
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        getMe()
            .then((res) => setUser(res.data))
            .catch(() => { localStorage.removeItem("token"); setToken(null); })
            .finally(() => setLoading(false));
    }, [token]);

    const login = useCallback((newToken, userData) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}