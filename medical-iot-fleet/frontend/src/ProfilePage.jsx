import { useState, useRef } from "react";
import {
    Camera, Save, ArrowLeft, Mail,
    Shield, Calendar, User, MapPin,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance";
import toast from "react-hot-toast";
import { fmtDate } from "../utils/formatters";

export default function ProfilePage() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [form, setForm] = useState({
        name: user?.name || "",
        assigned_floor: user?.assigned_floor || "",
    });
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);

    /* ── Local avatar preview ── */
    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024)
            return toast.error("Image must be under 2 MB");
        setPreview(URL.createObjectURL(file));
    };

    /* ── Save changes ── */
    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await api.put(`/api/users/${user.id}`, {
                name: form.name,
                assigned_floor: form.assigned_floor || null,
            });
            login(localStorage.getItem("token"), { ...user, ...res.data });
            toast.success("Profile updated!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const displayAvatar = preview || user?.avatar_url;

    const AUTH_LABEL = {
        local: "Email & Password",
        google: "Google Account",
        github: "GitHub Account",
    };

    const ROLE_STYLE = {
        admin: { background: "rgba(139,92,246,0.15)", color: "#A78BFA" },
        doctor: { background: "rgba(59,130,246,0.15)", color: "#60A5FA" },
        nurse: { background: "rgba(99,102,241,0.15)", color: "var(--primary-light)" },
        viewer: { background: "rgba(107,114,128,0.15)", color: "var(--text-muted)" },
    };

    return (
        <div className="max-w-2xl mx-auto space-y-5">

            {/* ── Back ── */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
                <ArrowLeft size={15} /> Back to Dashboard
            </button>

            {/* ── Hero card ── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: "rgba(17,24,39,0.82)",
                    border: "1px solid rgba(55,65,81,0.8)",
                    backdropFilter: "blur(18px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
            >
                {/* Cover */}
                <div
                    className="h-28 w-full"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(139,92,246,0.6) 50%, rgba(236,72,153,0.4) 100%)",
                    }}
                >
                    {/* subtle grid overlay */}
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundImage:
                                "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                        }}
                    />
                </div>

                {/* Avatar + name row */}
                <div className="px-6 pb-6">
                    <div className="flex items-end justify-between -mt-12 mb-5">

                        {/* Avatar */}
                        <div className="relative">
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={user?.name}
                                    className="w-24 h-24 rounded-2xl object-cover"
                                    style={{
                                        boxShadow:
                                            "0 0 0 3px rgba(99,102,241,0.5), 0 8px 24px rgba(0,0,0,0.5)",
                                    }}
                                />
                            ) : (
                                <div
                                    className="w-24 h-24 rounded-2xl flex items-center
                             justify-center text-white text-3xl font-bold"
                                    style={{
                                        background: "var(--gradient-primary)",
                                        boxShadow:
                                            "0 0 0 3px rgba(99,102,241,0.5), 0 8px 24px rgba(0,0,0,0.5)",
                                    }}
                                >
                                    {user?.name?.[0]?.toUpperCase()}
                                </div>
                            )}

                            {/* Camera overlay button */}
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl
                           flex items-center justify-center text-white
                           transition-all hover:scale-110"
                                style={{
                                    background: "var(--gradient-primary)",
                                    boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
                                }}
                            >
                                <Camera size={13} />
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={onFileChange}
                            />
                        </div>

                        {/* Role badge */}
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                            style={ROLE_STYLE[user?.role] || ROLE_STYLE.viewer}
                        >
                            {user?.role}
                        </span>
                    </div>

                    {/* Name + email */}
                    <h2
                        className="text-xl font-bold mb-0.5"
                        style={{ color: "var(--text-primary)" }}
                    >
                        {user?.name}
                    </h2>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {user?.email}
                    </p>
                </div>
            </div>

            {/* ── Info chips ── */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    {
                        icon: <Mail size={14} style={{ color: "var(--primary-light)" }} />,
                        label: "Auth",
                        value: AUTH_LABEL[user?.auth_provider] || user?.auth_provider,
                    },
                    {
                        icon: <Shield size={14} style={{ color: "var(--primary-light)" }} />,
                        label: "Role",
                        value: user?.role,
                        capitalize: true,
                    },
                    {
                        icon: <Calendar size={14} style={{ color: "var(--primary-light)" }} />,
                        label: "Joined",
                        value: fmtDate(user?.created_at)?.split(",")[0],
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-xl p-4"
                        style={{
                            background: "rgba(17,24,39,0.82)",
                            border: "1px solid rgba(55,65,81,0.8)",
                            backdropFilter: "blur(18px)",
                        }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            {item.icon}
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {item.label}
                            </span>
                        </div>
                        <p
                            className={`text-sm font-semibold truncate ${item.capitalize ? "capitalize" : ""}`}
                            style={{ color: "var(--text-primary)" }}
                        >
                            {item.value || "—"}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Edit form card ── */}
            <div
                className="rounded-2xl p-6"
                style={{
                    background: "rgba(17,24,39,0.82)",
                    border: "1px solid rgba(55,65,81,0.8)",
                    backdropFilter: "blur(18px)",
                }}
            >
                <h3
                    className="text-sm font-semibold mb-5"
                    style={{ color: "var(--text-secondary)" }}
                >
                    Edit Profile
                </h3>

                <form onSubmit={handleSave} className="space-y-4">

                    {/* Display Name */}
                    <div>
                        <label
                            className="flex items-center gap-1.5 text-xs mb-1.5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <User size={11} /> Display Name
                        </label>
                        <input
                            className="input"
                            placeholder="Your full name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    {/* Email — read only */}
                    <div>
                        <label
                            className="flex items-center gap-1.5 text-xs mb-1.5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <Mail size={11} /> Email (read-only)
                        </label>
                        <input
                            className="input opacity-50 cursor-not-allowed"
                            value={user?.email}
                            disabled
                        />
                    </div>

                    {/* Assigned floor */}
                    <div>
                        <label
                            className="flex items-center gap-1.5 text-xs mb-1.5"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <MapPin size={11} /> Assigned Floor
                        </label>
                        <input
                            className="input"
                            placeholder="e.g. ICU, Floor 2"
                            value={form.assigned_floor}
                            onChange={(e) =>
                                setForm({ ...form, assigned_floor: e.target.value })
                            }
                        />
                    </div>

                    {/* Save button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 text-sm"
                        >
                            <Save size={13} />
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Account info (read-only) ── */}
            <div
                className="rounded-2xl p-5"
                style={{
                    background: "rgba(17,24,39,0.6)",
                    border: "1px solid rgba(55,65,81,0.5)",
                }}
            >
                <h3
                    className="text-xs font-semibold mb-3 uppercase tracking-wider"
                    style={{ color: "var(--text-disabled)" }}
                >
                    Account Info
                </h3>
                <div className="space-y-2">
                    {[
                        { label: "User ID", value: user?.id },
                        { label: "Auth Provider", value: user?.auth_provider },
                        { label: "Account Status", value: user?.is_active ? "Active" : "Inactive" },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-xs">
                            <span style={{ color: "var(--text-muted)" }}>{label}</span>
                            <span
                                className="font-mono"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}