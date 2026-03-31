import { useState, useCallback } from "react";
import { Activity, Wifi, WifiOff, Power, Plus } from "lucide-react";
import StatCard from "../components/dashboard/StatCard";
import DeviceGrid from "../components/dashboard/DeviceGrid";
import DeviceForm from "../components/device/DeviceForm";
import { useDevices } from "../hooks/useDevices";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuth } from "../hooks/useAuth";

export default function Dashboard() {
    const { user } = useAuth();
    const { devices, stats, loading, refetch, patchDevice } = useDevices();
    const [showForm, setShowForm] = useState(false);
    const [filter, setFilter] = useState("all");

    // Live WebSocket updates
    useWebSocket("device_update", useCallback((msg) => {
        patchDevice(msg.device_id, {
            is_on: msg.is_on ?? undefined,
            is_online: msg.is_online ?? undefined,
            last_confidence: msg.confidence_score ?? undefined,
        });
    }, [patchDevice]));

    useWebSocket("state_change", useCallback((msg) => {
        patchDevice(msg.device_id, { is_on: msg.is_on });
    }, [patchDevice]));

    const filtered = devices.filter((d) => {
        if (filter === "online") return d.is_online;
        if (filter === "offline") return !d.is_online;
        if (filter === "on") return d.is_on;
        return true;
    });

    const FILTERS = [
        { key: "all", label: "All" },
        { key: "online", label: "Online" },
        { key: "offline", label: "Offline" },
        { key: "on", label: "Active (ON)" },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Hospital IoT Device Overview</p>
                </div>
                {user?.role === "admin" && (
                    <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm shadow-sm transition-all hover:shadow-md">
                        <Plus size={16} />
                        Register Device
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard label="Total Devices" value={stats?.total} icon={Activity} color="primary" />
                <StatCard label="Online" value={stats?.online} icon={Wifi} color="green" />
                <StatCard label="Offline" value={stats?.offline} icon={WifiOff} color="slate" />
                <StatCard label="Active (ON)" value={stats?.active} icon={Power} color="yellow" />
            </div>

            {/* Filter tabs (Segmented Control style) */}
            <div className="flex items-center justify-between">
                <div className="flex bg-[#F3F4F6] p-1 rounded-lg gap-1 border border-gray-100 shadow-inner">
                    {FILTERS.map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
                                filter === key
                                    ? "bg-gradient-to-r from-teal-500 to-sky-500 text-white shadow-sm"
                                    : "text-teal-600 bg-teal-50 hover:bg-teal-100"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <span className="text-sm text-gray-500 font-medium">
                    {filtered.length} device{filtered.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Grid — pass refetch as onDeleted so card removal refreshes list */}
            <DeviceGrid devices={filtered} loading={loading} onDeleted={refetch} />

            {showForm && (
                <DeviceForm onClose={() => setShowForm(false)} onCreated={refetch} />
            )}
        </div>
    );
}