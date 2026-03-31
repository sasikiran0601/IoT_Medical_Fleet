import { useState, useEffect, useCallback } from "react";
import AlertList from "../components/logs/AlertList";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { getAlerts } from "../api/alertApi";
import { useWebSocket } from "../hooks/useWebSocket";

export default function Alerts() {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [resolved, setResolved] = useState(false);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const res = await getAlerts({ is_resolved: resolved, limit: 100 });
            setAlerts(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAlerts(); }, [resolved]);

    useWebSocket("new_alert", useCallback((msg) => {
        if (!resolved) setAlerts((prev) => [msg, ...prev]);
    }, [resolved]));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-text-primary">Alerts</h1>
                    <p className="text-sm text-text-muted">
                        {alerts.length} {resolved ? "resolved" : "active"} alert{alerts.length !== 1 ? "s" : ""}
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-surface-2/80 p-1">
                    <button
                        onClick={() => setResolved(false)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${!resolved ? "bg-surface-3 text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setResolved(true)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${resolved ? "bg-surface-3 text-text-primary" : "text-text-muted hover:text-text-secondary"}`}
                    >
                        Resolved
                    </button>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : <AlertList alerts={alerts} onRefresh={fetchAlerts} />}
        </div>
    );
}
