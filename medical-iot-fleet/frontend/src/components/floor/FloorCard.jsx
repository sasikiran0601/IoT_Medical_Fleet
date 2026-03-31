import { useState } from "react";
import { ChevronDown, ChevronRight, Building2, Trash2 } from "lucide-react";
import RoomCard from "./RoomCard";
import { deleteFloor } from "../../api/floorapi";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";

export default function FloorCard({ floor, onDeleted }) {
    const [open, setOpen] = useState(true);
    const { user } = useAuth();

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete floor "${floor.name}"? All rooms and devices will be unlinked.`)) return;
        try {
            await deleteFloor(floor.id);
            toast.success("Floor deleted");
            onDeleted?.();
        } catch {
            toast.error("Failed to delete floor");
        }
    };

    return (
        <div className="card border border-border-subtle">
            <div
                className="flex cursor-pointer items-center justify-between"
                onClick={() => setOpen((o) => !o)}
            >
                <div className="flex items-center gap-3">
                    <Building2 size={18} className="text-primary-light" />
                    <div>
                        <h3 className="font-semibold text-text-primary">{floor.name}</h3>
                        {floor.description && (
                            <p className="text-xs text-text-muted">{floor.description}</p>
                        )}
                    </div>
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-secondary">
                        {floor.rooms?.length ?? 0} rooms
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {user?.role === "admin" && (
                        <button
                            onClick={handleDelete}
                            className="p-1 text-text-disabled transition-colors hover:text-error-light"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    {open ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
                </div>
            </div>

            {open && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {floor.rooms?.length ? (
                        floor.rooms.map((room) => (
                            <RoomCard key={room.id} room={room} onDeleted={onDeleted} />
                        ))
                    ) : (
                        <p className="col-span-full pl-1 text-sm text-text-muted">No rooms on this floor</p>
                    )}
                </div>
            )}
        </div>
    );
}
