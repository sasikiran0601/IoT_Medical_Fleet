import { useContext, useEffect } from "react";
import { WebSocketContext } from "../context/WebSocketContext";

/**
 * useWebSocket(eventType?, callback?) → { connected, subscribe }
 *
 * - Without args: just returns { connected, subscribe } for manual subscription.
 * - With args: automatically subscribes to `eventType` and calls `callback`
 *   whenever a matching WebSocket message arrives, unsubscribing on cleanup.
 */
export function useWebSocket(eventType, callback) {
    const { subscribe, connected } = useContext(WebSocketContext);

    useEffect(() => {
        if (!eventType || !callback) return;
        const unsub = subscribe(eventType, callback);
        return unsub;
    }, [eventType, callback, subscribe]);

    return { connected, subscribe };
}