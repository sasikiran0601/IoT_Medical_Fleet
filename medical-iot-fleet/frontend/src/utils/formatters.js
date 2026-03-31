import { formatDistanceToNow, format } from "date-fns";

export const timeAgo = (ts) => ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : "Never";
export const fmtDate = (ts) => ts ? format(new Date(ts), "dd MMM yyyy, HH:mm:ss") : "-";
export const fmtMins = (m) => {
    if (!m) return "-";
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
};