import { AlertTriangle, CheckCircle, Trash2, Lock } from "lucide-react";
import { resolveAlert, deleteAlert } from "../../api/alertApi";
import { useAuth } from "../../hooks/useAuth";
import { timeAgo } from "../../utils/formatters";
import toast from "react-hot-toast";

const TYPE_STYLE = {
    OFFLINE: "border-border-default bg-surface-2/40",
    LONG_RUNNING: "border-warning/30 bg-warning/10",
    ANOMALY: "border-error/30 bg-error/10",
    LOW_CONFIDENCE: "border-warning/30 bg-warning/10",
};

const TYPE_COLOR = {
    OFFLINE: "text-text-secondary",
    LONG_RUNNING: "text-warning-light",
    ANOMALY: "text-error-light",
    LOW_CONFIDENCE: "text-warning-light",
};

export default function AlertList({ alerts, onRefresh }) {
    const { user } = useAuth();
    const canManage = ["doctor", "admin"].includes(user?.role);

    if (!alerts.length) {
        return (
            <div className="py-12 text-center text-text-muted">
                <CheckCircle size={36} className="mx-auto mb-3 text-success" />
                <p>No active alerts</p>
            </div>
        );
    }

    const handleResolve = async (id) => {
        try {
            await resolveAlert(id);
            toast.success("Alert resolved");
            onRefresh?.();
        } catch { toast.error("Failed to resolve"); }
    };

    const handleDelete = async (id) => {
        try {
            await deleteAlert(id);
            toast.success("Alert deleted");
            onRefresh?.();
        } catch { toast.error("Failed to delete"); }
    };

    return (
        <div className="space-y-3">
            {alerts.map((alert) => (
                <div
                    key={alert.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 ${TYPE_STYLE[alert.alert_type] || TYPE_STYLE.OFFLINE}`}
                >
                    <AlertTriangle
                        size={18}
                        className={`mt-0.5 shrink-0 ${TYPE_COLOR[alert.alert_type] || "text-text-secondary"}`}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                            <span className={`text-xs font-semibold ${TYPE_COLOR[alert.alert_type] || "text-text-secondary"}`}>
                                {alert.alert_type.replace("_", " ")}
                            </span>
                            <span className="text-xs text-text-disabled">{timeAgo(alert.timestamp)}</span>
                        </div>
                        <p className="text-sm text-text-primary">{alert.message}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {canManage ? (
                            <>
                                <button
                                    onClick={() => handleResolve(alert.id)}
                                    className="rounded-lg bg-success/12 px-2 py-1 text-xs text-success-light transition-colors hover:bg-success/20"
                                >
                                    Resolve
                                </button>
                                <button
                                    onClick={() => handleDelete(alert.id)}
                                    className="text-text-disabled transition-colors hover:text-error-light"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </>
                        ) : (
                            <span className="flex items-center gap-1 text-xs text-text-disabled">
                                <Lock size={11} /> View only
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
