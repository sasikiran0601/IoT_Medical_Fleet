import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useWebSocket } from "../../hooks/useWebSocket";

export default function Navbar() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { connected } = useWebSocket();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setInitialized(true), 3000);
        return () => clearTimeout(t);
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const statusEl = connected ? (
        <span className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 pb-1.5 text-sm font-medium text-emerald-500">
            <Wifi size={14} className="mt-0.5" />
            Server Realtime
        </span>
    ) : !initialized ? (
        <span className="flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/8 px-3 py-1 pb-1.5 text-sm font-medium text-slate-500">
            <Loader2 size={14} className="mt-0.5 animate-spin" />
            Server Connecting
        </span>
    ) : (
        <span className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 pb-1.5 text-sm font-medium text-red-400">
            <WifiOff size={14} className="mt-0.5" />
            Server Realtime Offline
        </span>
    );

    return (
        <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-8 shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-200">
            <div>{statusEl}</div>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleLogout}
                    title="Sign out"
                    className="ml-1 flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                    <LogOut size={15} />
                    Logout
                </button>
            </div>
        </header>
    );
}
