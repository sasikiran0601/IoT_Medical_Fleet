import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Building2, ClipboardList,
    Bell, Key, Users, MailPlus,
    ChevronRight, ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "doctor", "nurse", "viewer"] },
    { to: "/floors", icon: Building2, label: "Floor View", roles: ["admin", "doctor", "nurse", "viewer"] },
    { to: "/logs", icon: ClipboardList, label: "Audit Logs", roles: ["admin", "doctor", "nurse"] },
    { to: "/api-manager", icon: Key, label: "API Manager", adminOnly: true },
    { to: "/users", icon: Users, label: "Users", adminOnly: true },
    { to: "/invites", icon: MailPlus, label: "Invites", adminOnly: true },
];

export default function Sidebar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const [showToggle, setShowToggle] = useState(false);
    const wrapperRef = useRef(null);
    const isAdmin = user?.role === "admin";
    const userRole = user?.role || "viewer";
    const sidebarWidth = collapsed ? 60 : 210;

    useEffect(() => {
        const handleMouseMove = (event) => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return;

            const rect = wrapper.getBoundingClientRect();
            const inSidebarBand =
                event.clientX >= rect.left &&
                event.clientX <= rect.right + 28 &&
                event.clientY >= rect.top &&
                event.clientY <= rect.bottom;

            setShowToggle((prev) => (prev === inSidebarBand ? prev : inSidebarBand));
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    return (
        <div
            ref={wrapperRef}
            className="relative shrink-0"
            style={{ width: `${sidebarWidth}px` }}
        >
            <aside
                className="flex h-full flex-col transition-all duration-300"
                style={{
                    width: "100%",
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fbfe 62%, #f2f7fc 100%)",
                    borderRight: "1px solid #e2e8f0",
                    boxShadow: "2px 0 12px rgba(15,23,42,0.06)",
                    position: "relative",
                    zIndex: 20,
                    transition: "all 0.2s ease",
                }}
            >
                <div className="flex h-16 shrink-0 items-center px-3">
                    <div className={`flex items-center ${collapsed ? "justify-center w-full" : "gap-0"}`}>
                        <img
                            src="/brand/caresync-logo.svg?v=20260417a"
                            alt="CareSync Logo"
                            className="h-9 w-9 shrink-0 object-contain"
                        />
                        {!collapsed && (
                            <span
                                className="block whitespace-nowrap text-lg leading-none tracking-[-0.012em]"
                                style={{
                                    color: "#1e293b",
                                    fontFamily: "Poppins, 'Plus Jakarta Sans', Inter, 'Segoe UI', sans-serif",
                                    fontWeight: 600,
                                    transform: "translateY(0.5px)",
                                }}
                            >
                                CareSync
                            </span>
                        )}
                    </div>
                </div>

                <nav className={`flex-1 space-y-1 overflow-y-auto px-2 py-2 ${collapsed ? "pt-3" : ""}`}>
                    {NAV.map(({ to, icon: Icon, label, adminOnly, roles }) => {
                        if (adminOnly && !isAdmin) return null;
                        if (roles && !roles.includes(userRole)) return null;
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                title={collapsed ? label : undefined}
                                style={({ isActive }) =>
                                    isActive
                                        ? {
                                            background: "linear-gradient(135deg, #0ea5b7, #0284c7)",
                                            boxShadow: "0 3px 10px rgba(2,132,199,0.28)",
                                            color: "#fff",
                                        }
                                        : { color: "#475569" }
                                }
                                className={`flex items-center gap-2.5 rounded-lg text-[14px] font-medium transition-all duration-150 hover:bg-[#eef4fa] ${
                                    collapsed ? "h-9 justify-center px-0" : "px-2.5 py-2"
                                }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon
                                            size={15}
                                            className="shrink-0"
                                            style={{ color: isActive ? "#fff" : "var(--text-muted)" }}
                                        />
                                        {!collapsed && (
                                            <span className="whitespace-nowrap" style={{ color: isActive ? "#fff" : "var(--text-secondary)" }}>
                                                {label}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div
                    className="shrink-0 space-y-1.5 px-2.5 py-2.5"
                    style={{ borderTop: "1px solid rgba(148,163,184,0.16)" }}
                >
                    {["admin", "doctor", "nurse"].includes(userRole) && (
                        <NavLink
                            to="/alerts"
                            title={collapsed ? "Alerts" : undefined}
                            style={({ isActive }) =>
                                isActive
                                    ? { background: "var(--primary-bg)", color: "var(--primary)" }
                                    : { color: "var(--text-muted)" }
                            }
                            className={`flex items-center gap-2.5 rounded-lg text-[14px] transition-all ${collapsed ? "h-9 justify-center px-0" : "px-2.5 py-2"}`}
                        >
                            <Bell size={14} className="shrink-0" />
                            {!collapsed && (
                                <span style={{ color: "var(--text-secondary)" }}>Alerts</span>
                            )}
                        </NavLink>
                    )}

                    <div className={`flex items-center rounded-lg py-1.5 ${collapsed ? "justify-center px-0" : "gap-2.5 px-1.5"}`}>
                        <button
                            onClick={() => navigate("/profile")}
                            title="My Profile"
                            className="shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none"
                        >
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user?.name}
                                    className="h-[34px] w-[34px] rounded-full object-cover"
                                    style={{ boxShadow: "0 0 0 2px rgba(99,102,241,0.5)" }}
                                />
                            ) : (
                                <div
                                    className="flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-bold text-white"
                                    style={{
                                        background: "var(--gradient-primary)",
                                        boxShadow: "0 0 0 2px rgba(99,102,241,0.4)",
                                    }}
                                >
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </button>

                        {!collapsed && (
                            <div className="pointer-events-none min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                                    {user?.name}
                                </p>
                                <p className="mt-0.5 text-[11px] capitalize" style={{ color: "var(--text-muted)" }}>
                                    {user?.role}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <button
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none"
                style={{
                    position: "absolute",
                    left: "calc(100% - 17px)",
                    top: "74px",
                    width: "32px",
                    height: "32px",
                    borderRadius: "9999px",
                    background: "linear-gradient(145deg, #FFFFFF 0%, #F1F5F9 100%)",
                    border: "1px solid rgba(148,163,184,0.35)",
                    boxShadow: "0 8px 18px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.9)",
                    zIndex: 30,
                    opacity: showToggle ? 1 : 0,
                    transform: showToggle ? "translateX(0) scale(1)" : "translateX(4px) scale(0.9)",
                    pointerEvents: showToggle ? "auto" : "none",
                    transition: "opacity 180ms ease, transform 200ms ease",
                }}
            >
                {collapsed
                    ? <ChevronRight size={17} className="text-slate-500" />
                    : <ChevronLeft size={17} className="text-slate-500" />
                }
            </button>
        </div>
    );
}
