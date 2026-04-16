function trimTrailingSlash(value) {
    return value.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
    const envApi = (import.meta.env.VITE_API_URL || "").trim();
    if (envApi) return trimTrailingSlash(envApi);

    if (typeof window !== "undefined") {
        const { hostname } = window.location;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            return "http://localhost:8000";
        }
        // Production safety fallback for this deployment domain family.
        if (hostname.endsWith("n8nautomations.me")) {
            return "https://api.n8nautomations.me";
        }
    }

    return "http://localhost:8000";
}

export function getWsBaseUrl() {
    const envWs = (import.meta.env.VITE_WS_URL || "").trim();
    if (envWs) return trimTrailingSlash(envWs);

    const apiBase = getApiBaseUrl();
    try {
        const url = new URL(apiBase);
        url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return trimTrailingSlash(url.origin);
    } catch {
        return "";
    }
}

