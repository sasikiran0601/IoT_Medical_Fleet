import { useState } from "react";
import { Power, PowerOff, Lock } from "lucide-react";
import { controlDevice } from "../../api/deviceApi";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

export default function ControlPanel({ device, onUpdated }) {
    const { user } = useAuth();
    const canControl = ["nurse", "doctor", "admin"].includes(user?.role);
    const [purpose, setPurpose] = useState("");
    const [loading, setLoading] = useState(false);

    const handleControl = async (action) => {
        if (action === "turn_on" && !purpose.trim()) {
            return toast.error("Please enter a purpose before turning on");
        }
        try {
            setLoading(true);
            await controlDevice(device.device_id, action, purpose);
            toast.success(`Device turned ${action === "turn_on" ? "ON" : "OFF"}`);
            setPurpose("");
            onUpdated?.();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Control failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Device Control</h3>

            <div className={`flex items-center gap-3 rounded-lg border p-3 ${
                device.is_on ? "border-success/30 bg-success/10" : "border-border-default bg-surface-2/40"
            }`}>
                <span className={`h-3 w-3 rounded-full ${
                    device.is_on ? "bg-success-light shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-text-disabled"
                }`} />
                <div>
                    <p className="text-sm font-medium text-text-primary">
                        {device.is_on ? "Device is ON" : "Device is OFF"}
                    </p>
                    <p className="text-xs text-text-muted">
                        {device.is_online ? "Connected" : "Offline"}
                    </p>
                </div>
            </div>

            {canControl ? (
                <>
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">
                            Purpose / Reason <span className="text-error-light">*</span>
                        </label>
                        <input
                            className="input text-sm"
                            placeholder="e.g. Patient monitoring - Bed 3"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-text-disabled">Required to turn device ON. Logged for audit trail.</p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            disabled={loading || device.is_on}
                            onClick={() => handleControl("turn_on")}
                            className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <Power size={14} /> Turn ON
                        </button>
                        <button
                            disabled={loading || !device.is_on}
                            onClick={() => handleControl("turn_off")}
                            className="btn-danger flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <PowerOff size={14} /> Turn OFF
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-2/60 px-3 py-2.5 text-xs text-text-muted">
                    <Lock size={13} />
                    <span>Device control is available to Nurses, Doctors, and Admins only.</span>
                </div>
            )}
        </div>
    );
}
