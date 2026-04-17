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
    const sidebarWidth = collapsed ? 64 : 220;

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
                    background: "linear-gradient(180deg, #ffffff 0%, #f3f8fc 60%, #eaf4fb 100%)",
                    borderRight: "none",
                    boxShadow: "4px 0 24px -4px rgba(14,165,233,0.10), 2px 0 8px -2px rgba(20,184,166,0.08)",
                    position: "relative",
                    zIndex: 20,
                    transition: "all 0.2s ease",
                }}
            >
                <div className="flex h-16 shrink-0 items-center gap-3 px-4">
                    <img
                        src="/brand/caresync-logo.svg"
                        alt="CareSync Logo"
                        className="h-10 w-10 shrink-0 rounded-xl object-contain"
                        style={{ boxShadow: "0 6px 16px rgba(14,165,233,0.24)" }}
                    />
                    {!collapsed && (
                        <div className="min-w-0 overflow-hidden">
                            <p
                                className="whitespace-nowrap text-sm font-bold leading-none"
                                style={{
                                    color: "var(--text-primary)",
                                    fontFamily: "'Plus Jakarta Sans', Inter, sans-serif",
                                }}
                            >
                                CareSync
                            </p>
                        </div>
                    )}
                </div>

                <nav className={`flex-1 space-y-0.5 overflow-y-auto px-2 py-2 ${collapsed ? "pt-4" : ""}`}>
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
                                            background: "linear-gradient(135deg, #14B8A6, #0EA5E9)",
                                            boxShadow: "0 4px 14px rgba(14,165,233,0.28)",
                                            color: "#fff",
                                        }
                                        : { color: "#6B7280" }
                                }
                                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 hover:bg-[#F1F5F9] ${
                                    collapsed ? "h-10 justify-center px-0" : "px-3 py-2.5"
                                }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon
                                            size={16}
                                            className="shrink-0"
                                            style={{ color: isActive ? "#fff" : "var(--text-muted)" }}
                                        />
                                        {!collapsed && (
                                            <span style={{ color: isActive ? "#fff" : "var(--text-secondary)" }}>
                                                {label}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="shrink-0 space-y-1 px-2 py-3">
                    {["admin", "doctor", "nurse"].includes(userRole) && (
                        <NavLink
                            to="/alerts"
                            title={collapsed ? "Alerts" : undefined}
                            style={({ isActive }) =>
                                isActive
                                    ? { background: "var(--primary-bg)", color: "var(--primary)" }
                                    : { color: "var(--text-muted)" }
                            }
                            className={`flex items-center gap-3 rounded-xl text-sm transition-all ${collapsed ? "h-10 justify-center px-0" : "px-3 py-2"}`}
                        >
                            <Bell size={15} className="shrink-0" />
                            {!collapsed && (
                                <span style={{ color: "var(--text-secondary)" }}>Alerts</span>
                            )}
                        </NavLink>
                    )}

                    <div className={`flex items-center rounded-xl py-2 ${collapsed ? "justify-center px-0" : "gap-3 px-2"}`}>
                        <button
                            onClick={() => navigate("/profile")}
                            title="My Profile"
                            className="shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none"
                        >
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user?.name}
                                    className="h-8 w-8 rounded-full object-cover"
                                    style={{ boxShadow: "0 0 0 2px rgba(99,102,241,0.5)" }}
                                />
                            ) : (
                                <div
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
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
                                <p className="truncate text-xs font-semibold leading-none" style={{ color: "var(--text-primary)" }}>
                                    {user?.name}
                                </p>
                                <p className="mt-0.5 text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
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
                    top: "78px",
                    width: "34px",
                    height: "34px",
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
