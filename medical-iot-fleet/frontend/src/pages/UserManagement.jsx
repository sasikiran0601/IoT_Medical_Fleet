import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { getUsers, updateUser, deleteUser } from "../api/userapi";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useAuth } from "../hooks/useAuth";
import { fmtDate } from "../utils/formatters";
import { ROLES } from "../utils/constants";
import toast from "react-hot-toast";

const ROLE_BADGE = {
    admin: "bg-primary/12 text-primary-light",
    doctor: "bg-info/12 text-info-light",
    nurse: "bg-success/12 text-success-light",
    viewer: "bg-surface-2 text-text-secondary",
};

export default function UserManagement() {
    const { user: me } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await getUsers();
            setUsers(res.data);
        } catch { toast.error("Failed to load users"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleRoleChange = async (userId, role) => {
        try {
            await updateUser(userId, { role });
            toast.success("Role updated");
            fetchUsers();
        } catch { toast.error("Failed to update role"); }
    };

    const handleToggleActive = async (userId, is_active) => {
        try {
            await updateUser(userId, { is_active: !is_active });
            toast.success(is_active ? "User deactivated" : "User activated");
            fetchUsers();
        } catch { toast.error("Failed to update user"); }
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(true);
        try {
            await deleteUser(pendingDelete.id);
            toast.success("User deleted");
            setPendingDelete(null);
            fetchUsers();
        } catch (err) { toast.error(err.response?.data?.detail || "Failed to delete user"); }
        finally { setDeleting(false); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-xl font-bold text-text-primary">User Management</h1>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-text-muted">{users.length} registered staff accounts</p>
                    <Link
                        to="/invites"
                        className="rounded-lg border border-border-default bg-surface-2 px-3 py-1.5 text-xs font-medium text-text-secondary transition hover:bg-surface-3"
                    >
                        Manage Invites
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-section/40">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-bg-section text-xs uppercase tracking-wide text-text-secondary">
                            <th className="px-4 py-3 text-left">User</th>
                            <th className="px-4 py-3 text-left">Auth</th>
                            <th className="px-4 py-3 text-left">Role</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Joined</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {users.map((u) => (
                            <tr key={u.id} className="transition-colors hover:bg-surface-2/30">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        {u.avatar_url
                                            ? <img src={u.avatar_url} className="h-8 w-8 rounded-full" alt="" />
                                            : (
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary-light">
                                                    {u.name[0].toUpperCase()}
                                                </div>
                                            )}
                                        <div>
                                            <p className="font-medium text-text-primary">{u.name}</p>
                                            <p className="text-xs text-text-muted">{u.email}</p>
                                        </div>
                                    </div>
                                </td>

                                <td className="px-4 py-3">
                                    <span className="text-xs capitalize text-text-secondary">{u.auth_provider}</span>
                                </td>

                                <td className="px-4 py-3">
                                    {u.id === me?.id ? (
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_BADGE[u.role]}`}>
                                            {u.role} (you)
                                        </span>
                                    ) : (
                                        <select
                                            className="rounded-lg border border-border-default bg-surface-2 px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                        >
                                            {ROLES.map((r) => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    )}
                                </td>

                                <td className="px-4 py-3">
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.is_active ? "bg-success/12 text-success-light" : "bg-error/12 text-error-light"}`}>
                                        {u.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>

                                <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                                    {fmtDate(u.created_at)}
                                </td>

                                <td className="px-4 py-3">
                                    {u.id !== me?.id && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggleActive(u.id, u.is_active)}
                                                className={`rounded-lg px-2 py-1 text-xs transition-colors ${u.is_active
                                                    ? "bg-surface-2 text-text-secondary hover:bg-error/12 hover:text-error-light"
                                                    : "bg-surface-2 text-text-secondary hover:bg-success/12 hover:text-success-light"
                                                }`}
                                            >
                                                {u.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                            <button
                                                onClick={() => setPendingDelete({ id: u.id, name: u.name })}
                                                className="text-text-disabled transition-colors hover:text-error-light"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete User"
                description={`Delete user "${pendingDelete?.name ?? ""}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                loading={deleting}
                onCancel={() => !deleting && setPendingDelete(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
