import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DoorOpen, Trash2 } from "lucide-react";
import { getDevices } from "../../api/deviceApi";
import { deleteRoom } from "../../api/floorapi";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../common/ConfirmDialog";
import toast from "react-hot-toast";

export default function RoomCard({ room, onDeleted }) {
    const [devices, setDevices] = useState([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        getDevices({ room_id: room.id })
            .then((r) => setDevices(r.data))
            .catch(() => {});
    }, [room.id]);

    const openDeleteConfirm = (e) => {
        e.stopPropagation();
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteRoom(room.id);
            toast.success("Room deleted");
            setShowDeleteConfirm(false);
            onDeleted?.();
        } catch {
            toast.error("Failed to delete room");
        } finally {
            setDeleting(false);
        }
    };

    const onlineCount = devices.filter((d) => d.is_online).length;

    return (
        <div className="rounded-xl border border-border-default bg-surface-2 p-4 transition-colors hover:border-primary/40">
            <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <DoorOpen size={15} className="text-text-secondary" />
                    <span className="text-sm font-medium text-text-primary">{room.name}</span>
                </div>
                {user?.role === "admin" && (
                    <button onClick={openDeleteConfirm} className="text-text-disabled transition-colors hover:text-error-light">
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            <div className="space-y-1.5">
                {devices.length === 0 && (
                    <p className="text-xs text-text-disabled">No devices</p>
                )}
                {devices.map((d) => (
                    <div
                        key={d.id}
                        onClick={() => navigate(`/devices/${d.device_id}`)}
                        className="flex cursor-pointer items-center justify-between rounded-lg bg-bg-section px-2 py-1.5 text-xs transition-colors hover:bg-surface-3"
                    >
                        <span className="truncate text-text-secondary">{d.name}</span>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${d.is_online ? "bg-green-500" : "bg-red-500"}`} />
                    </div>
                ))}
            </div>

            <p className="mt-2 text-xs text-text-muted">
                {onlineCount}/{devices.length} online
            </p>

            <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete Room"
                description={`Delete "${room.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                loading={deleting}
                onCancel={() => !deleting && setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
