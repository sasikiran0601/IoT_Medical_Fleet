import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { createDevice } from "../../api/deviceApi";
import { getFloors, getRooms } from "../../api/floorapi";
import { DEVICE_TYPES } from "../../utils/constants";
import toast from "react-hot-toast";

export default function DeviceForm({ onClose, onCreated }) {
    const [floors, setFloors] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: "", device_type: DEVICE_TYPES[0], room_id: "",
    });

    useEffect(() => {
        getFloors().then((r) => setFloors(r.data)).catch(() => {});
    }, []);

    const onFloorChange = async (floorId) => {
        if (!floorId) return setRooms([]);
        try {
            const res = await getRooms(floorId);
            setRooms(res.data);
        } catch { setRooms([]); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error("Device name required");
        try {
            setLoading(true);
            const res = await createDevice(form);
            toast.success(`Device registered! ID: ${res.data.device_id}`);
            onCreated?.(res.data);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to create device");
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-section shadow-panel">
                <div className="flex items-center justify-between border-b border-border-subtle p-5">
                    <h2 className="font-semibold text-text-primary">Register New Device</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 p-5">
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Device Name *</label>
                        <input
                            className="input"
                            placeholder="e.g. ICU Ventilator 1"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Device Type *</label>
                        <select
                            className="input"
                            value={form.device_type}
                            onChange={(e) => setForm({ ...form, device_type: e.target.value })}
                        >
                            {DEVICE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Floor (optional)</label>
                        <select
                            className="input"
                            onChange={(e) => onFloorChange(e.target.value)}
                        >
                            <option value="">- Select Floor -</option>
                            {floors.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>

                    {rooms.length > 0 && (
                        <div>
                            <label className="mb-1 block text-xs text-text-secondary">Room (optional)</label>
                            <select
                                className="input"
                                value={form.room_id}
                                onChange={(e) => setForm({ ...form, room_id: e.target.value })}
                            >
                                <option value="">- Select Room -</option>
                                {rooms.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex-1">
                            {loading ? "Registering..." : "Register Device"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
