import { useState, useEffect, useCallback } from "react";
import { getDevices, getDeviceStats } from "../api/deviceApi";

export function useDevices(params = {}) {
    const [devices, setDevices] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            setLoading(true);
            const [devRes, statRes] = await Promise.all([
                getDevices(params),
                getDeviceStats(),
            ]);
            setDevices(devRes.data);
            setStats(statRes.data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(params)]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Update a single device in state (used by WebSocket updates)
    const patchDevice = useCallback((deviceId, patch) => {
        setDevices((prev) =>
            prev.map((d) => (d.device_id === deviceId ? { ...d, ...patch } : d))
        );
    }, []);

    return { devices, stats, loading, error, refetch: fetchAll, patchDevice };
}