import { fmtDate, fmtMins } from "../../utils/formatters";

const ACTION_BADGE = {
    TURN_ON: "bg-success/12 text-success-light",
    TURN_OFF: "bg-surface-2 text-text-secondary",
    REGISTERED: "bg-info/12 text-info-light",
    OTA_UPDATE: "bg-primary/12 text-primary-light",
};

export default function AuditTable({ logs, loading }) {
    if (loading) return <p className="py-8 text-center text-sm text-text-muted">Loading logs...</p>;
    if (!logs.length) return <p className="py-8 text-center text-sm text-text-muted">No audit logs found</p>;

    return (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-section/40">
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-bg-section text-left text-xs uppercase tracking-wide text-text-secondary">
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Action</th>
                        <th className="px-4 py-3">Device</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Purpose</th>
                        <th className="px-4 py-3">Duration</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                    {logs.map((log) => (
                        <tr key={log.id} className="transition-colors hover:bg-surface-2/30">
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-text-secondary">
                                {fmtDate(log.timestamp)}
                            </td>
                            <td className="px-4 py-3">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_BADGE[log.action] || "bg-surface-2 text-text-secondary"}`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <p className="font-medium text-text-primary">{log.device_name}</p>
                                <p className="font-mono text-xs text-text-muted">{log.device_id}</p>
                            </td>
                            <td className="px-4 py-3">
                                <p className="text-text-primary">{log.user_name}</p>
                                <p className="text-xs capitalize text-text-muted">{log.user_role}</p>
                            </td>
                            <td className="max-w-xs truncate px-4 py-3 text-text-secondary">
                                {log.purpose || <span className="text-text-disabled">-</span>}
                            </td>
                            <td className="px-4 py-3 text-xs text-text-secondary">
                                {fmtMins(log.duration_minutes)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
