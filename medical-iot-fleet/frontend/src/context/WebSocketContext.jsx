import { createContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

export const WebSocketContext = createContext(null);

function toWsUrl(httpLikeUrl) {
    if (!httpLikeUrl) return "";
    try {
        const url = new URL(httpLikeUrl);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return `${url.origin}/ws/dashboard`;
    } catch {
        return "";
    }
}

function buildWsCandidates() {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const sameHostProxy = `${protocol}://${window.location.host}/ws/dashboard`;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const directApi = toWsUrl(apiBase);
    const explicitWsBase = import.meta.env.VITE_WS_URL || "";
    const explicitWs = explicitWsBase
        ? `${explicitWsBase.replace(/\/$/, "")}/ws/dashboard`
        : "";

    // If explicit WS URL is provided, avoid Vite /ws proxy fallback to reduce noisy proxy errors.
    const preferred = explicitWs ? [explicitWs, directApi] : [directApi, sameHostProxy];
    return preferred.filter(
        (url, idx, arr) => Boolean(url) && arr.indexOf(url) === idx
    );
}

export function WebSocketProvider({ children }) {
    const { token } = useAuth();
    const wsRef = useRef(null);
    const retryRef = useRef(null);
    const retryCount = useRef(0);
    const endpointIndexRef = useRef(0);
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
        if (!token) {
            setConnected(false);
            return undefined;
        }

        const wsCandidates = buildWsCandidates();
        if (!wsCandidates.length) {
            setConnected(false);
            return undefined;
        }

        let destroyed = false;

        function connect() {
            if (destroyed) return;

            if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
                wsRef.current.close();
            }

            const target = wsCandidates[endpointIndexRef.current % wsCandidates.length];
            const ws = new WebSocket(target);
            wsRef.current = ws;

            ws.onopen = () => {
                if (destroyed) {
                    ws.close();
                    return;
                }
                setConnected(true);
                retryCount.current = 0;
                endpointIndexRef.current = 0;
                console.log(`[WS] Connected: ${target}`);
            };

            ws.onmessage = (event) => {
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
                // handled by onclose
            };

            ws.onclose = () => {
                if (destroyed) return;
                setConnected(false);
                endpointIndexRef.current = (endpointIndexRef.current + 1) % wsCandidates.length;
                const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
                retryCount.current += 1;
                console.log(`[WS] Disconnected. Reconnecting in ${delay / 1000}s...`);
                retryRef.current = setTimeout(connect, delay);
            };
        }

        connect();

        // Keep-alive ping every 10s for better proxy/router stability.
        const ping = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                try {
                    wsRef.current.send("ping");
                } catch {
                    // noop; reconnect logic will recover
                }
            }
        }, 10000);

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
