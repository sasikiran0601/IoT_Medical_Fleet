import { useEffect, useMemo, useState } from "react";
import { MailPlus, RotateCcw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { createInvite, getInvites, revokeInvite } from "../api/inviteApi";
import { ROLES } from "../utils/constants";
import { fmtDate, parseApiDate } from "../utils/formatters";

function inviteStatus(invite) {
    if (invite.is_revoked) return "Revoked";
    if (invite.is_used) return "Used";
    const expiresAt = parseApiDate(invite.expires_at);
    if (expiresAt && expiresAt.getTime() < Date.now()) return "Expired";
    return "Pending";
}

const STATUS_BADGE = {
    Pending: "bg-warning/12 text-warning-light",
    Used: "bg-success/12 text-success-light",
    Revoked: "bg-error/12 text-error-light",
    Expired: "bg-surface-2 text-text-secondary",
};

export default function InviteManagement() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [resendingInviteId, setResendingInviteId] = useState(null);
    const [revokeTarget, setRevokeTarget] = useState(null);
    const [revoking, setRevoking] = useState(false);
    const [form, setForm] = useState({
        email: "",
        role: "viewer",
        assigned_floor: "",
        expires_hours: 72,
    });

    const fetchInvites = async () => {
        try {
            setLoading(true);
            const res = await getInvites();
            setInvites(res.data || []);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to load invites");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) fetchInvites();
        else setLoading(false);
    }, [isAdmin]);

    const summary = useMemo(() => {
        return invites.reduce(
            (acc, inv) => {
                const status = inviteStatus(inv);
                acc.total += 1;
                acc[status.toLowerCase()] += 1;
                return acc;
            },
            { total: 0, pending: 0, used: 0, revoked: 0, expired: 0 },
        );
    }, [invites]);

    const handleCreateInvite = async (e) => {
        e.preventDefault();
        if (!form.email.trim()) {
            toast.error("Invite email is required");
            return;
        }
        setCreating(true);
        try {
            await createInvite({
                email: form.email.trim(),
                role: form.role,
                assigned_floor: form.assigned_floor.trim() || null,
                expires_hours: Number(form.expires_hours) || 72,
            });
            toast.success("Invite created and email sent");
            setForm((prev) => ({ ...prev, email: "", assigned_floor: "" }));
            fetchInvites();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create invite");
        } finally {
            setCreating(false);
        }
    };

    const handleRevokeInvite = async () => {
        if (!revokeTarget) return;
        setRevoking(true);
        try {
            await revokeInvite(revokeTarget.id);
            toast.success("Invite revoked");
            setRevokeTarget(null);
            fetchInvites();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to revoke invite");
        } finally {
            setRevoking(false);
        }
    };

    const handleResendInvite = async (invite) => {
        setResendingInviteId(invite.id);
        try {
            const expiresAt = parseApiDate(invite.expires_at);
            const createdAt = parseApiDate(invite.created_at);
            const durationHours =
                expiresAt && createdAt
                    ? Math.max(1, Math.round((expiresAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60)))
                    : 72;

            await createInvite({
                email: invite.email,
                role: invite.role,
                assigned_floor: invite.assigned_floor || null,
                expires_hours: durationHours,
            });
            toast.success("New invite sent");
            fetchInvites();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to resend invite");
        } finally {
            setResendingInviteId(null);
        }
    };

    if (loading) return <LoadingSpinner />;

    if (!isAdmin) {
        return (
            <div className="rounded-xl border border-border-subtle bg-bg-section/40 p-6">
                <h1 className="text-xl font-bold text-text-primary">Invites</h1>
                <p className="mt-2 text-sm text-text-muted">Admin access required.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-text-primary">Invite Management</h1>
                <p className="text-sm text-text-muted">Create and manage staff onboarding links.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Total" value={summary.total} />
                <Stat label="Pending" value={summary.pending} />
                <Stat label="Used" value={summary.used} />
                <Stat label="Revoked" value={summary.revoked} />
                <Stat label="Expired" value={summary.expired} />
            </div>

            <form
                onSubmit={handleCreateInvite}
                className="space-y-4 rounded-xl border border-border-subtle bg-bg-section/40 p-4"
            >
                <div className="flex items-center gap-2">
                    <MailPlus size={18} className="text-primary-light" />
                    <h2 className="text-sm font-semibold text-text-primary">Create Invite</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs text-text-muted">Staff Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary"
                            placeholder="nurse.ana@hospital.com"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-muted">Role</label>
                        <select
                            value={form.role}
                            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                            className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary"
                        >
                            {ROLES.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-muted">Assigned Floor</label>
                        <input
                            value={form.assigned_floor}
                            onChange={(e) => setForm((prev) => ({ ...prev, assigned_floor: e.target.value }))}
                            className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary"
                            placeholder="floor1"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-muted">Expires (hours)</label>
                        <input
                            type="number"
                            min={1}
                            max={720}
                            value={form.expires_hours}
                            onChange={(e) => setForm((prev) => ({ ...prev, expires_hours: e.target.value }))}
                            className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={creating}
                        className="rounded-lg bg-[linear-gradient(135deg,#14B8A6,#0EA5E9)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-70"
                    >
                        {creating ? "Sending..." : "Send Invite"}
                    </button>
                </div>
            </form>

            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-section/40">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-bg-section text-xs uppercase tracking-wide text-text-secondary">
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Floor</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Expires</th>
                            <th className="px-4 py-3 text-left">Created</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {invites.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-sm text-text-muted">
                                    No invites yet.
                                </td>
                            </tr>
                        ) : invites.map((inv) => {
                            const status = inviteStatus(inv);
                            const canRevoke = status === "Pending";
                            const canResend = status === "Expired" || status === "Revoked";
                            return (
                                <tr key={inv.id} className="transition-colors hover:bg-surface-2/30">
                                    <td className="px-4 py-3 text-text-primary">{inv.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs capitalize text-primary-light">
                                            {inv.role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-text-secondary">{inv.assigned_floor || "-"}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[status]}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{fmtDate(inv.expires_at)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">{fmtDate(inv.created_at)}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {canResend && (
                                                <button
                                                    onClick={() => handleResendInvite(inv)}
                                                    className="text-text-disabled transition-colors hover:text-primary-light"
                                                    title="Resend invite"
                                                    disabled={resendingInviteId === inv.id}
                                                >
                                                    <RotateCcw size={14} />
                                                </button>
                                            )}
                                            {canRevoke ? (
                                                <button
                                                    onClick={() => setRevokeTarget({ id: inv.id, email: inv.email })}
                                                    className="text-text-disabled transition-colors hover:text-error-light"
                                                    title="Revoke invite"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            ) : (!canResend && (
                                                <span className="text-xs text-text-disabled">-</span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                open={!!revokeTarget}
                title="Revoke Invite"
                description={`Revoke invite for "${revokeTarget?.email ?? ""}"?`}
                confirmText="Revoke"
                cancelText="Cancel"
                loading={revoking}
                onCancel={() => !revoking && setRevokeTarget(null)}
                onConfirm={handleRevokeInvite}
            />
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="rounded-xl border border-border-subtle bg-bg-section/40 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold text-text-primary">{value}</p>
        </div>
    );
}
