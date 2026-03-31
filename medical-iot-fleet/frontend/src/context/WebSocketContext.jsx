import { createContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

export const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
    const { token } = useAuth();
    const wsRef = useRef(null);
    const retryRef = useRef(null);
    const retryCount = useRef(0);
    const listenersRef = useRef({});
    const [connected, setConnected] = useState(false);

    const subscribe = useCallback((eventType, cb) => {
        if (!listenersRef.current[eventType]) listenersRef.current[eventType] = [];
        listenersRef.current[eventType].push(cb);
        return () => {
            listenersRef.current[eventType] =
                listenersRef.current[eventType].filter((fn) => fn !== cb);
        };
    }, []);

    useEffect(() => {
        if (!token) return;

        // Build correct WS URL — in dev vite proxies /ws so use relative path
        const isDev = import.meta.env.DEV;
        const wsBase = isDev
            ? `ws://${window.location.host}`
            : (import.meta.env.VITE_WS_URL || `ws://${window.location.host}`);

        let destroyed = false;

        function connect() {
            if (destroyed) return;

            // Close any existing socket
            if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
                wsRef.current.close();
            }

            const ws = new WebSocket(`${wsBase}/ws/dashboard`);
            wsRef.current = ws;

            ws.onopen = () => {
                if (destroyed) { ws.close(); return; }
                setConnected(true);
                retryCount.current = 0;
                console.log("[WS] Connected");
            };

            ws.onmessage = (event) => {
                // Ignore keep-alive pong
                if (event.data === "pong") return;
                try {
                    const data = JSON.parse(event.data);
                    const type = data.type || "unknown";
                    (listenersRef.current[type] || []).forEach((cb) => cb(data));
                    (listenersRef.current["*"] || []).forEach((cb) => cb(data));
                } catch (e) {
                    console.warn("[WS] Parse error", e);
                }
            };

            ws.onerror = () => {
                // onclose will handle reconnect
            };

            ws.onclose = () => {
                if (destroyed) return;
                setConnected(false);
                // Exponential back-off: 1s → 2s → 4s → max 30s
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
                retryCount.current += 1;
                console.log(`[WS] Disconnected. Reconnecting in ${delay / 1000}s...`);
                retryRef.current = setTimeout(connect, delay);
            };
        }

        connect();

        // Keep-alive ping every 25 s
        const ping = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send("ping");
            }
        }, 25000);

        return () => {
            destroyed = true;
            clearTimeout(retryRef.current);
            clearInterval(ping);
            wsRef.current?.close();
            setConnected(false);
        };
    }, [token]);

    return (
        <WebSocketContext.Provider value={{ connected, subscribe }}>
            {children}
        </WebSocketContext.Provider>
    );
}