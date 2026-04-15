import { formatDistanceToNow, format } from "date-fns";

export const parseApiDate = (ts) => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts !== "string") return new Date(ts);

    // Backend often returns UTC timestamps without timezone suffix.
    // Treat timezone-less values as UTC to avoid local-time drift.
    const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(ts);
    return new Date(hasTimezone ? ts : `${ts}Z`);
};

export const timeAgo = (ts) => {
    const d = parseApiDate(ts);
    return d ? formatDistanceToNow(d, { addSuffix: true }) : "Never";
};

export const fmtDate = (ts) => {
    const d = parseApiDate(ts);
    return d ? format(d, "dd MMM yyyy, HH:mm:ss") : "-";
};

export const fmtMins = (m) => {
    if (!m) return "-";
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
};
