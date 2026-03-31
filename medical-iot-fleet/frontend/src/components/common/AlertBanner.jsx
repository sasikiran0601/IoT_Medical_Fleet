import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getAlerts } from "../../api/alertApi";
import { useWebSocket } from "../../hooks/useWebSocket";

/**
 * AlertBanner - sticky top banner that shows unresolved alert count.
 * Auto-updates via WebSocket when new alerts arrive.
 */
export default function AlertBanner() {
    const [count, setCount] = useState(0);
    const [visible, setVisible] = useState(true);
    const { subscribe } = useWebSocket();

    useEffect(() => {
        getAlerts({ is_resolved: false, limit: 1 })
            .then((res) => setCount(res.data.length > 0 ? res.data.length : 0))
            .catch(() => {});
    }, []);

    useEffect(() => {
        const unsub = subscribe("new_alert", () =>
            setCount((prev) => prev + 1)
        );
        return unsub;
    }, [subscribe]);

    if (!visible || count === 0) return null;

    return (
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-error/30 bg-error-bg/92 px-5 py-2.5 text-sm text-error-light backdrop-blur-xl">
            <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                <strong>{count} unresolved alert{count !== 1 ? "s" : ""}</strong>
                <span className="text-error-light/85">check the Alerts page</span>
            </span>
            <button
                onClick={() => setVisible(false)}
                title="Dismiss"
                className="flex text-error-light transition-colors hover:text-white"
            >
                <X size={16} />
            </button>
        </div>
    );
}
