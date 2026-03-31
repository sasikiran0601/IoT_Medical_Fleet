import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import FloorCard from "../components/floor/FloorCard";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { getFloors, createFloor, createRoom } from "../api/floorapi";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function FloorView() {
    const { user } = useAuth();
    const [floors, setFloors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showFloorModal, setShowFloorModal] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [floorForm, setFloorForm] = useState({ name: "", description: "" });
    const [roomForm, setRoomForm] = useState({ name: "", floor_id: "" });

    const fetchFloors = async ({ showSpinner = false } = {}) => {
        try {
            if (showSpinner) setLoading(true);
            const res = await getFloors();
            setFloors(res.data);
        } catch { toast.error("Failed to load floors"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchFloors({ showSpinner: true }); }, []);

    const handleAddFloor = async (e) => {
        e.preventDefault();
        try {
            await createFloor(floorForm);
            toast.success("Floor added");
            setShowFloorModal(false);
            setFloorForm({ name: "", description: "" });
            fetchFloors();
        } catch { toast.error("Failed to add floor"); }
    };

    const handleAddRoom = async (e) => {
        e.preventDefault();
        if (!roomForm.floor_id) return toast.error("Select a floor");
        try {
            await createRoom(roomForm);
            toast.success("Room added");
            setShowRoomModal(false);
            setRoomForm({ name: "", floor_id: "" });
            fetchFloors();
        } catch { toast.error("Failed to add room"); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text-primary">Floor View</h1>
                    <p className="text-sm text-text-muted">Hospital hierarchy - Floor to Room to Device</p>
                </div>
                {user?.role === "admin" && (
                    <div className="flex gap-3">
                        <button onClick={() => setShowRoomModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
                            <Plus size={14} /> Add Room
                        </button>
                        <button onClick={() => setShowFloorModal(true)} className="btn-primary flex items-center gap-2 text-sm">
                            <Plus size={14} /> Add Floor
                        </button>
                    </div>
                )}
            </div>

            {floors.length === 0 ? (
                <div className="py-20 text-center text-text-muted">
                    <p className="mb-1 text-lg">No floors configured</p>
                    <p className="text-sm">Add a floor to start organising devices</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {floors.map((floor) => (
                        <FloorCard key={floor.id} floor={floor} onDeleted={fetchFloors} />
                    ))}
                </div>
            )}

            {showFloorModal && (
                <Modal title="Add Floor" onClose={() => setShowFloorModal(false)}>
                    <form onSubmit={handleAddFloor} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs text-text-secondary">Floor Name *</label>
                            <input
                                className="input"
                                placeholder="e.g. ICU, Floor 2"
                                value={floorForm.name}
                                onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-text-secondary">Description</label>
                            <input
                                className="input"
                                placeholder="Optional description"
                                value={floorForm.description}
                                onChange={(e) => setFloorForm({ ...floorForm, description: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowFloorModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button type="submit" className="btn-primary flex-1">Add Floor</button>
                        </div>
                    </form>
                </Modal>
            )}

            {showRoomModal && (
                <Modal title="Add Room" onClose={() => setShowRoomModal(false)}>
                    <form onSubmit={handleAddRoom} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs text-text-secondary">Room Name *</label>
                            <input
                                className="input"
                                placeholder="e.g. Room 101"
                                value={roomForm.name}
                                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-text-secondary">Floor *</label>
                            <select
                                className="input"
                                value={roomForm.floor_id}
                                onChange={(e) => setRoomForm({ ...roomForm, floor_id: e.target.value })}
                            >
                                <option value="">- Select Floor -</option>
                                {floors.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowRoomModal(false)} className="btn-secondary flex-1">Cancel</button>
                            <button type="submit" className="btn-primary flex-1">Add Room</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

function Modal({ title, onClose, children }) {
    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 z-[999999] p-4">
            <div className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-section shadow-panel">
                <div className="flex items-center justify-between border-b border-border-subtle p-5">
                    <h2 className="font-semibold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="text-xl leading-none text-text-secondary hover:text-text-primary">
                        &times;
                    </button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>,
        document.body
    );
}
