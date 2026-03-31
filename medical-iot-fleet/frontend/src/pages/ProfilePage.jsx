import { useState, useRef } from "react";
import { Pencil, Trash2, Save, Lock, Download, UserX } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import api from "../api/axiosInstance";
import toast from "react-hot-toast";

const AUTH_LABEL = { local: "Local", google: "Google", github: "GitHub" };

// ── Reusable section card ────────────────────────────────────────────────
function Section({ title, children }) {
    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border-default)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
        >
            {title && (
                <div
                    className="px-6 py-4"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                    <p
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                    >
                        {title}
                    </p>
                </div>
            )}
            <div className="px-6 py-5">{children}</div>
        </div>
    );
}

// ── Two-column form row ───────────────────────────────────────────────────
function FieldRow({ label, children }) {
    return (
        <div
            className="flex items-center py-4"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
            <p
                className="w-44 shrink-0 text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
            >
                {label}
            </p>
            <div className="flex-1">{children}</div>
        </div>
    );
}

// ── Account action row ────────────────────────────────────────────────────
function ActionRow({ label, sub, action, actionStyle, onAction, last }) {
    return (
        <div
            className="flex items-center justify-between py-4"
            style={last ? {} : { borderBottom: "1px solid var(--border-subtle)" }}
        >
            <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
            </div>
            <button
                onClick={onAction}
                className="text-sm font-semibold transition-colors px-1"
                style={actionStyle}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
                {action}
            </button>
        </div>
    );
}

// ── Read-only input style ─────────────────────────────────────────────────
const roStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border-default)",
    color: "var(--text-muted)",
    borderRadius: "0.75rem",
    padding: "0.5rem 0.75rem",
    width: "100%",
    fontSize: "0.875rem",
    cursor: "not-allowed",
};

// ── Editable input style ──────────────────────────────────────────────────
const editStyle = {
    background: "var(--surface-1)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    borderRadius: "0.75rem",
    padding: "0.5rem 0.75rem",
    width: "100%",
    fontSize: "0.875rem",
    outline: "none",
    transition: "border-color 0.2s",
};

export default function ProfilePage() {
    const { user, login } = useAuth();
    const fileRef = useRef(null);

    // split name into first / last for the two-field layout
    const parts = (user?.name || "").split(" ");
    const [firstName, setFirstName] = useState(parts[0] || "");
    const [lastName, setLastName] = useState(parts.slice(1).join(" ") || "");
    const [website, setWebsite] = useState("");
    const [preview, setPreview] = useState(null);   // blob URL
    const [avatarFile, setAvatarFile] = useState(null);   // File object
    const [saving, setSaving] = useState(false);
    const [avatarRemoved, setAvatarRemoved] = useState(false);

    // ── Avatar pick ───────────────────────────────────────────────────────
    const onPickFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return toast.error("Max 2 MB");
        setAvatarFile(file);
        setPreview(URL.createObjectURL(file));
        setAvatarRemoved(false);
    };

    const onRemoveAvatar = () => {
        setPreview(null);
        setAvatarFile(null);
        setAvatarRemoved(true);
        if (fileRef.current) fileRef.current.value = "";
    };

    // ── Save profile ──────────────────────────────────────────────────────
    const handleSave = async () => {
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) return toast.error("Name is required");
        setSaving(true);
        try {
            const payload = { name: fullName };
            
            if (avatarFile) {
                payload.avatar_url = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(avatarFile);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            } else if (avatarRemoved) {
                payload.avatar_url = "";
            }

            const res = await api.put(`/api/users/${user.id}`, payload);
            login(localStorage.getItem("token"), { ...user, ...res.data });
            toast.success("Profile saved!");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    // ── Password change (local auth only) ─────────────────────────────────
    const handlePasswordChange = () => {
        toast("Password change coming soon", { icon: "🔒" });
    };

    // ── Data export ───────────────────────────────────────────────────────
    const handleExport = async () => {
        try {
            const res = await api.get(`/api/logs/audit?limit=500`);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "my_audit_data.json"; a.click();
            URL.revokeObjectURL(url);
            toast.success("Data exported");
        } catch { toast.error("Export failed"); }
    };

    const displayAvatar = avatarRemoved ? null : (preview || user?.avatar_url);
    const isLocal = user?.auth_provider === "local";

    return (
        <div className="max-w-3xl mx-auto space-y-4 pb-10">

            {/* ── Page title ── */}
            <h1 className="text-2xl font-bold pt-1" style={{ color: "var(--text-primary)" }}>
                My Profile
            </h1>

            {/* ── Hero identity card ── */}
            <Section>
                <div className="flex items-center gap-5">
                    {/* Avatar with overlay buttons */}
                    <div className="relative shrink-0 group">
                        {displayAvatar ? (
                            <img
                                src={displayAvatar}
                                alt={user?.name}
                                className="w-20 h-20 rounded-full object-cover"
                                style={{ boxShadow: "0 0 0 3px rgba(99,102,241,0.45)" }}
                            />
                        ) : (
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                                style={{
                                    background: "var(--primary-bg)",
                                    color: "var(--primary)",
                                    boxShadow: "0 0 0 3px rgba(99,102,241,0.3)",
                                }}
                            >
                                {user?.name?.[0]?.toUpperCase()}
                            </div>
                        )}

                        {/* Hover overlay with edit/delete */}
                        <div
                            className="absolute inset-0 rounded-full flex items-center justify-center
                         gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: "rgba(0,0,0,0.55)" }}
                        >
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{ background: "rgba(99,102,241,0.85)" }}
                                title="Upload photo"
                            >
                                <Pencil size={13} className="text-white" />
                            </button>
                            {displayAvatar && (
                                <button
                                    onClick={onRemoveAvatar}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                    style={{ background: "rgba(239,68,68,0.85)" }}
                                    title="Remove photo"
                                >
                                    <Trash2 size={13} className="text-white" />
                                </button>
                            )}
                        </div>

                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />
                    </div>

                    {/* Name + email + role badge */}
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold leading-none mb-1" style={{ color: "var(--text-primary)" }}>
                            {user?.name}
                        </h2>
                        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                            style={{
                                background: "var(--primary-bg)",
                                color: "var(--primary)",
                                border: "1px solid var(--focus-ring)",
                            }}
                        >
                            {user?.role} Role
                        </span>
                    </div>
                </div>
            </Section>

            {/* ── Profile edit form ── */}
            <Section title="Profile">
                {/* Avatar description row */}
                <div
                    className="flex items-start justify-between py-4"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                    <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Profile avatar</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            Upload your profile photo (max 2 MB)
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fileRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                            style={{
                                background: "rgba(99,102,241,0.14)",
                                border: "1px solid rgba(99,102,241,0.3)",
                                color: "var(--primary-light)",
                            }}
                        >
                            <Pencil size={11} /> Upload
                        </button>
                        {displayAvatar && (
                            <button
                                onClick={onRemoveAvatar}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                                style={{
                                    background: "rgba(239,68,68,0.1)",
                                    border: "1px solid rgba(239,68,68,0.25)",
                                    color: "var(--error-light)",
                                }}
                            >
                                <Trash2 size={11} /> Remove
                            </button>
                        )}
                    </div>
                </div>

                {/* Username */}
                <FieldRow label="Username">
                    <input style={roStyle} value={user?.name} disabled />
                </FieldRow>

                {/* Email */}
                <FieldRow label="Email">
                    <input style={roStyle} value={user?.email} disabled />
                </FieldRow>

                {/* First name */}
                <FieldRow label="First name">
                    <input
                        style={editStyle}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
                    />
                </FieldRow>

                {/* Last name */}
                <FieldRow label="Last name">
                    <input
                        style={editStyle}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
                    />
                </FieldRow>

                {/* Website URL */}
                <FieldRow label="Website URL">
                    <input
                        style={editStyle}
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="Website URL"
                        onFocus={(e) => { e.target.style.borderColor = "var(--primary)"; }}
                        onBlur={(e) => { e.target.style.borderColor = "var(--border-default)"; }}
                    />
                </FieldRow>

                {/* SAVE button — bottom right */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 text-sm px-6"
                    >
                        <Save size={13} />
                        {saving ? "Saving…" : "SAVE"}
                    </button>
                </div>
            </Section>

            {/* ── Account details ── */}
            <Section title="Account Details">
                {/* Authentication Provider read-only */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div
                        className="rounded-xl p-4"
                        style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-default)",
                        }}
                    >
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Authentication Provider</p>
                        <p className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                            {AUTH_LABEL[user?.auth_provider] || user?.auth_provider}
                        </p>
                    </div>
                    <div
                        className="rounded-xl p-4"
                        style={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border-default)",
                        }}
                    >
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Account ID</p>
                        <p
                            className="text-sm font-mono truncate"
                            style={{ color: "var(--text-secondary)" }}
                            title={user?.id}
                        >
                            {user?.id}
                        </p>
                    </div>
                </div>

                {/* Password change — only for local auth */}
                {isLocal && (
                    <ActionRow
                        label="Password"
                        action="CHANGE"
                        actionStyle={{ color: "var(--primary-light)" }}
                        onAction={handlePasswordChange}
                    />
                )}

                {/* Data export */}
                <ActionRow
                    label="Data export"
                    sub="Request all of your data in JSON format"
                    action="EXPORT"
                    actionStyle={{ color: "var(--primary-light)" }}
                    onAction={handleExport}
                />

                {/* Delete account */}
                <ActionRow
                    label="Delete account"
                    sub="Permanently remove your account and all associated data"
                    action="DELETE"
                    actionStyle={{ color: "var(--error-light)" }}
                    onAction={() => toast.error("Contact your admin to delete account")}
                    last
                />
            </Section>
        </div>
    );
}