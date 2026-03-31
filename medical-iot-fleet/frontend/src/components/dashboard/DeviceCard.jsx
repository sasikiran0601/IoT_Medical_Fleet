import { useNavigate } from "react-router-dom";
import { Wifi, WifiOff, Power, Clock, Trash2 } from "lucide-react";
import { timeAgo } from "../../utils/formatters";
import { deleteDevice } from "../../api/deviceApi";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

// Soft green / red backgrounds for the confidence bar
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
    const isAdmin = user?.role === "admin";

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete device "${device.name}"? This cannot be undone.`)) return;
        try {
            await deleteDevice(device.device_id);
            toast.success("Device deleted");
            onDeleted?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to delete device");
        }
    };

    return (
        <div
            onClick={() => navigate(`/devices/${device.device_id}`)}
            className="group relative bg-white rounded-2xl p-5 cursor-pointer border border-[#E5E7EB] shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-200"
        >
            {/* Header row */}
            <div className="flex items-start justify-between mb-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${device.is_online ? "bg-emerald-500" : "bg-red-500"}`} />
                        <span className="text-[11px] font-mono text-gray-400 tracking-wider truncate">
                            {device.device_id}
                        </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900 truncate tracking-tight mb-0.5">
                        {device.name}
                    </h3>
                    <p className="text-xs font-medium text-gray-500">
                        {device.device_type}
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* ON/OFF badge */}
                    <span
                        className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border ${
                            device.is_on
                                ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                    >
                        <Power size={11} strokeWidth={2.5} />
                        {device.is_on ? "ON" : "OFF"}
                    </span>

                    {/* Delete button (Admin Only) */}
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            title="Delete device"
                            className="opacity-0 group-hover:opacity-100 transition-all duration-200 blur-sm group-hover:blur-none w-7 h-7 rounded-md flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                        >
                            <Trash2 size={13} strokeWidth={2.5} />
                        </button>
                    )}
                </div>
            </div>

            {/* Confidence bar */}
            {device.last_confidence != null && (
                <div className="mb-4">
                    <div className="flex justify-between items-center text-xs font-medium mb-1.5">
                        <span className="text-gray-500">Sensor Confidence</span>
                        <span className={CONFIDENCE_COLOR(device.last_confidence)}>
                            {device.last_confidence}%
                        </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                        <div
                            className={`h-full transition-all duration-500 ease-out ${CONFIDENCE_BG(device.last_confidence)}`}
                            style={{ width: `${device.last_confidence}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 mt-2 pt-3 border-t border-gray-100">
                <span className="flex items-center gap-1.5 capitalize">
                    {device.is_online
                        ? <Wifi size={13} className="text-emerald-500" strokeWidth={2.5} />
                        : <WifiOff size={13} className="text-red-500" strokeWidth={2.5} />
                    }
                    {device.is_online ? "Online" : "Offline"}
                </span>
                <span className="flex items-center gap-1.5">
                    <Clock size={13} strokeWidth={2.5} />
                    {timeAgo(device.last_seen)}
                </span>
            </div>
        </div>
    );
}