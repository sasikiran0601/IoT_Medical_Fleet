import DeviceCard from "./DeviceCard";
import LoadingSpinner from "../common/LoadingSpinner";

export default function DeviceGrid({ devices, loading, onDeleted }) {
    if (loading) return <LoadingSpinner />;

    if (!devices.length) {
        return (
            <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
                <p className="text-lg mb-1">No devices found</p>
                <p className="text-sm">Register a device to get started</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((device) => (
                <DeviceCard key={device.id} device={device} onDeleted={onDeleted} />
            ))}
        </div>
    );
}
