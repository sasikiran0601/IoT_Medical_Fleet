import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Building2, ClipboardList,
    Bell, Key, Users, Activity, Sparkles,
    ChevronRight, ChevronLeft,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";

const NAV = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/floors", icon: Building2, label: "Floor View" },
    { to: "/logs", icon: ClipboardList, label: "Audit Logs" },
    { to: "/api-manager", icon: Key, label: "API Manager", adminOnly: true },
    { to: "/users", icon: Users, label: "Users", adminOnly: true },
];

export default function Sidebar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const isAdmin = user?.role === "admin";

    return (
        <>
            {/* ── Sidebar panel ── */}
            <aside
                className="flex flex-col shrink-0 transition-all duration-300"
                style={{
                    width: collapsed ? "64px" : "220px",
                    background: "var(--surface-1)",
                    borderRight: "1px solid var(--border-default)",
                    backdropFilter: "blur(20px)",
                    position: "relative",       /* needed so toggle button sibling aligns */
                    zIndex: 20,
                }}
            >
                {/* Logo row */}
                <div
                    className="flex items-center gap-3 px-4 shrink-0"
                    style={{
                        height: "64px",           /* fixed height = same as Navbar */
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                            background: "var(--gradient-primary)",
                            boxShadow: "0 4px 12px rgba(99,102,241,0.35)",
                        }}
                    >
                        <Sparkles size={16} className="text-white" />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 overflow-hidden">
                            <p className="text-sm font-bold leading-none whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                                IoT Vitals
                            </p>
                            <p className="text-[10px] mt-0.5 whitespace-nowrap" style={{ color: "var(--primary-light)" }}>
                                Fleet Manager
                            </p>
                        </div>
                    )}
                </div>

                {/* Section label */}
                {!collapsed && (
                    <p
                        className="px-4 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-disabled)" }}
                    >
                        Navigation
                    </p>
                )}

                {/* Nav links */}
                <nav className={`flex-1 px-2 py-2 space-y-0.5 overflow-y-auto ${collapsed ? "pt-4" : ""}`}>
                    {NAV.map(({ to, icon: Icon, label, adminOnly }) => {
                        if (adminOnly && !isAdmin) return null;
                        return (
                            <NavLink
                                key={to}
                                to={to}
                                end={to === "/"}
                                title={collapsed ? label : undefined}
                                style={({ isActive }) =>
                                    isActive
                                        ? {
                                            background: "var(--gradient-primary)",
                                            boxShadow: "0 4px 14px rgba(99,102,241,0.28)",
                                            color: "#fff",
                                        }
                                        : { color: "var(--text-secondary)" }
                                }
                                className={`flex items-center gap-3 rounded-xl text-sm
                            transition-all duration-150 font-medium
                            ${collapsed ? "px-0 justify-center h-10" : "px-3 py-2.5"}`}
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

                {/* Bottom section */}
                <div
                    className="shrink-0 px-2 py-3 space-y-1"
                    style={{ borderTop: "1px solid var(--border-subtle)" }}
                >
                    {/* Alerts */}
                    <NavLink
                        to="/alerts"
                        title={collapsed ? "Alerts" : undefined}
                        style={({ isActive }) =>
                            isActive
                                ? { background: "var(--primary-bg)", color: "var(--primary)" }
                                : { color: "var(--text-muted)" }
                        }
                        className={`flex items-center gap-3 rounded-xl text-sm transition-all
                        ${collapsed ? "px-0 justify-center h-10" : "px-3 py-2"}`}
                    >
                        <Bell size={15} className="shrink-0" />
                        {!collapsed && (
                            <span style={{ color: "var(--text-secondary)" }}>Alerts</span>
                        )}
                    </NavLink>

                    {/* Profile — only avatar is clickable */}
                    <div
                        className={`flex items-center rounded-xl py-2
                        ${collapsed ? "justify-center px-0" : "px-2 gap-3"}`}
                    >
                        <button
                            onClick={() => navigate("/profile")}
                            title="My Profile"
                            className="shrink-0 transition-transform hover:scale-105 focus:outline-none rounded-full"
                        >
                            {user?.avatar_url ? (
                                <img
                                    src={user.avatar_url}
                                    alt={user?.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                    style={{ boxShadow: "0 0 0 2px rgba(99,102,241,0.5)" }}
                                />
                            ) : (
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center
                             text-white text-xs font-bold"
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
                            <div className="min-w-0 flex-1 pointer-events-none">
                                <p
                                    className="text-xs font-semibold truncate leading-none"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    {user?.name}
                                </p>
                                <p
                                    className="text-[10px] capitalize mt-0.5"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    {user?.role}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* ── Collapse toggle — rendered OUTSIDE aside so it floats cleanly ── */}
            {/* Positioned relative to the Layout flex row, not overlapping any border */}
            <button
                onClick={() => setCollapsed((c) => !c)}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="flex items-center justify-center transition-all hover:scale-110 focus:outline-none"
                style={{
                    position: "absolute",
                    /* sits just outside the sidebar right edge */
                    left: collapsed ? "calc(64px - 12px)" : "calc(220px - 12px)",
                    top: "20px",                      /* vertically centred in logo row */
                    width: "24px",
                    height: "24px",
                    borderRadius: "9999px",
                    background: "var(--gradient-primary)",
                    border: "2px solid var(--surface-1)",
                    boxShadow: "0 2px 8px rgba(99,102,241,0.45)",
                    zIndex: 30,
                    transition: "left 0.3s",
                }}
            >
                {collapsed
                    ? <ChevronRight size={12} className="text-white" />
                    : <ChevronLeft size={12} className="text-white" />
                }
            </button>
        </>
    );
}