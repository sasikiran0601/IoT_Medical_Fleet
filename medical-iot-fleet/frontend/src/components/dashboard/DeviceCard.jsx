import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, Power, Clock, Trash2 } from "lucide-react";
import { timeAgo } from "../../utils/formatters";
import { deleteDevice } from "../../api/deviceApi";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";

const CONFIDENCE_COLOR = (pct) => {
    if (pct == null) return "text-gray-400";
    if (pct >= 90) return "text-emerald-600";
    if (pct >= 70) return "text-amber-600";
    return "text-red-600";
};

const CONFIDENCE_BG = (pct) => {
    if (pct >= 90) return "bg-emerald-500";
    if (pct >= 70) return "bg-amber-400";
    return "bg-red-500";
};

export default function DeviceCard({ device, onDeleted }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const isAdmin = user?.role === "admin";

    const openDeleteConfirm = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteDevice(device.device_id);
            toast.success("Device deleted");
            setShowDeleteConfirm(false);
            onDeleted?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete device");
        } finally {
            setDeleting(false);
        }
    };

    const statusTone = getDeviceStatusTone(device);
    const statusLabel = getDeviceStatusLabel(device);

    return (
        <>
            <div
                onClick={() => navigate(`/devices/${device.device_id}`)}
                className="group relative cursor-pointer p-5 transition-all duration-200"
                style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.04)";
                }}
            >
                <div className="mb-4 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                            <span
                                className="aspect-square w-2 shrink-0 rounded-full shadow-sm"
                                style={{ background: statusTone.dot }}
                            />
                            <span className="truncate font-mono text-[11px] tracking-wider text-gray-400">
                                {device.device_id}
                            </span>
                        </div>
                        <h3 className="mb-0.5 truncate text-base font-bold tracking-tight text-gray-900">
                            {device.name}
                        </h3>
                        <p className="text-xs font-medium text-gray-500">{device.device_type}</p>
                    </div>

                    <div className="ml-2 flex shrink-0 items-center gap-2">
                        <span
                            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                device.is_on
                                    ? "border-indigo-100 bg-indigo-50 text-indigo-700"
                                    : "border-gray-200 bg-gray-100 text-gray-500"
                            }`}
                        >
                            <Power size={11} strokeWidth={2.5} />
                            {device.is_on ? "ON" : "OFF"}
                        </span>

                        {isAdmin && (
                            <button
                                onClick={openDeleteConfirm}
                                title="Delete device"
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-red-50 text-red-600 opacity-0 blur-sm transition-all duration-200 hover:bg-red-100 hover:text-red-700 group-hover:opacity-100 group-hover:blur-none"
                            >
                                <Trash2 size={13} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>
                </div>

                {device.last_confidence != null && (
                    <div className="mb-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
                            <span className="text-gray-500">Sensor Confidence</span>
                            <span className={CONFIDENCE_COLOR(device.last_confidence)}>
                                {device.last_confidence}%
                            </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                            <div
                                className={`h-full transition-all duration-500 ease-out ${CONFIDENCE_BG(device.last_confidence)}`}
                                style={{ width: `${device.last_confidence}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-3 text-[11px] font-semibold">
                    <span
                        className="flex items-center gap-1.5 capitalize transition-colors duration-200"
                        style={{ color: statusTone.text }}
                    >
                        {statusTone.icon === "online" ? (
                            <Wifi size={13} strokeWidth={2.5} />
                        ) : (
                            <WifiOff size={13} strokeWidth={2.5} />
                        )}
                        {statusLabel}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={13} strokeWidth={2.5} />
                        {timeAgo(device.last_data_at || device.last_seen)}
                    </span>
                </div>
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete Device"
                description={`Delete "${device.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                loading={deleting}
                onCancel={() => !deleting && setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
            />
        </>
    );
}

function getDeviceStatusLabel(device) {
    if (device.connection_state === "connected" && device.data_state === "fresh") return "Receiving live data";
    if (device.connection_state === "connected" && device.data_state === "stale") return "Connected, data stale";
    if (device.connection_state === "connected") return "Connected";
    if (device.connection_state === "unknown" && device.data_state === "fresh") return "Legacy telemetry";
    return "Disconnected";
}

function getDeviceStatusTone(device) {
    if (device.connection_state === "connected" && device.data_state === "fresh") {
        return { text: "#22C55E", dot: "#22C55E", icon: "online" };
    }
    if (device.connection_state === "connected" && device.data_state === "stale") {
        return { text: "#F59E0B", dot: "#F59E0B", icon: "online" };
    }
    if (device.connection_state === "connected") {
        return { text: "#14B8A6", dot: "#14B8A6", icon: "online" };
    }
    if (device.connection_state === "unknown" && device.data_state === "fresh") {
        return { text: "#0EA5E9", dot: "#0EA5E9", icon: "online" };
    }
    return { text: "#EF4444", dot: "#EF4444", icon: "offline" };
}
