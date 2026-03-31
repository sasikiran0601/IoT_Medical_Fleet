import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Wifi, WifiOff, Loader2, Bell } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useWebSocket } from "../../hooks/useWebSocket";
import { getAlertCount } from "../../api/alertApi";

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { connected } = useWebSocket();
    const [alertCount, setAlertCount] = useState(0);
    // Show "connecting..." for first 3 seconds before declaring offline
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setInitialized(true), 3000);
        return () => clearTimeout(t);
    }, []);

    const fetchCount = async () => {
        try { setAlertCount((await getAlertCount()).data.unresolved); }
        catch { /* silent */ }
    };

    useEffect(() => { fetchCount(); }, []);

    useWebSocket("new_alert", useCallback(() => {
        setAlertCount((c) => c + 1);
    }, []));

    const handleLogout = () => { logout(); navigate("/login"); };

    // Connection status display
    const statusEl = connected ? (
        <span className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 pb-1.5 rounded-full border border-emerald-100">
            <Wifi size={14} className="mt-0.5" />
            Live
        </span>
    ) : !initialized ? (
        <span className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-50 px-3 py-1 pb-1.5 rounded-full border border-gray-200">
            <Loader2 size={14} className="animate-spin mt-0.5" />
            Connecting
        </span>
    ) : (
        <span className="flex items-center gap-2 text-sm font-medium text-red-500 bg-red-50 px-3 py-1 pb-1.5 rounded-full border border-red-100">
            <WifiOff size={14} className="mt-0.5" />
            Offline
        </span>
    );

    return (
        <header className="h-16 flex items-center justify-between px-8 shrink-0 bg-[#FFFFFF] border-b border-[#E5E7EB]">
            {/* Left — connection status */}
            <div>{statusEl}</div>

            {/* Right — alerts + avatar + logout */}
            <div className="flex items-center gap-4">

                {/* Alert bell */}
                <button
                    onClick={() => navigate("/alerts")}
                    className="relative text-gray-500 hover:bg-[#F3F4F6] hover:text-gray-900 w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                >
                    <Bell size={18} />
                    {alertCount > 0 && (
                        <span className="absolute 0 top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] text-white bg-red-500 border-2 border-white">
                            {alertCount > 9 ? "9+" : alertCount}
                        </span>
                    )}
                </button>

                {/* Avatar (read-only in navbar — profile is in sidebar) */}
                {user?.avatar_url ? (
                    <img 
                        src={user.avatar_url} 
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-100 shadow-sm" 
                        alt="avatar"
                    />
                ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-teal-50 text-teal-700 text-xs font-bold ring-2 ring-white shadow-sm">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                )}

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="flex items-center justify-center w-9 h-9 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}