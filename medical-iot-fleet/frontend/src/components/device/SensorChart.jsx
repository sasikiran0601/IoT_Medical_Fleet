import {
    AreaChart,
    Area,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { parseApiDate } from "../../utils/formatters";

const AREA_COLORS = ["#14B8A6", "#0EA5E9", "#22C55E", "#F59E0B", "#6366F1", "#A855F7", "#F87171"];
const META_FIELDS = new Set(["device_id", "status", "timestamp"]);
const ECG_ONLY_NUMERIC_FIELDS = new Set(["ecg_raw", "r_peak", "rr_interval", "rr_interval_ms", "sample_no"]);
const CHART_EXCLUDED_FIELDS = new Set(["sample_no"]);

function normalizeLabel(key) {
    return key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toNumberIfNumeric(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}

function safeParse(readingsText) {
    try {
        return JSON.parse(readingsText || "{}");
    } catch {
        return {};
    }
}

export default function SensorChart({ data = [], device = null }) {
    if (!data.length) {
        return (
            <div className="card flex h-48 items-center justify-center text-sm text-text-muted">
                Waiting for sensor data...
            </div>
        );
    }

    const parsedRecords = [...data]
        .map((record) => {
            const parsedTimestamp = parseApiDate(record.timestamp);
            return {
                timestamp: record.timestamp,
                timestampDate: parsedTimestamp,
                timestampMs: parsedTimestamp ? parsedTimestamp.getTime() : 0,
                readings: safeParse(record.readings),
            };
        })
        .filter((record) => record.timestampDate)
        .sort((a, b) => a.timestampMs - b.timestampMs);

    const isEcgDevice = String(device?.device_type || "").toUpperCase() === "ECG";
    const numericFieldSet = new Set();
    for (const record of parsedRecords) {
        for (const [key, value] of Object.entries(record.readings)) {
            if (META_FIELDS.has(key)) continue;
            if (CHART_EXCLUDED_FIELDS.has(key)) continue;
            if (!isEcgDevice && ECG_ONLY_NUMERIC_FIELDS.has(key)) continue;
            const numeric = toNumberIfNumeric(value);
            if (numeric !== null) numericFieldSet.add(key);
        }
    }
    const numericFields = Array.from(numericFieldSet);

    const chartData = parsedRecords.map((record) => {
        const row = {
            time: format(record.timestampDate, "HH:mm:ss"),
            fullTime: format(record.timestampDate, "dd MMM yyyy, HH:mm:ss"),
            ts: record.timestampMs,
        };
        for (const field of numericFields) {
            const numeric = toNumberIfNumeric(record.readings[field]);
            if (numeric !== null) row[field] = numeric;
        }
        return row;
    });

    const latestReadings = safeParse(data[0]?.readings);
    const metaEntries = Object.entries(latestReadings).filter(([key, value]) => {
        if (!isEcgDevice && ECG_ONLY_NUMERIC_FIELDS.has(key)) return false;
        if (key === "timestamp") return false;
        return META_FIELDS.has(key) || toNumberIfNumeric(value) === null;
    });
    const latestTimestampDate = parseApiDate(data[0]?.timestamp);
    const latestPacketTime = latestTimestampDate
        ? format(latestTimestampDate, "dd MMM yyyy, HH:mm:ss")
        : null;
    const isLiveSensorStream = Boolean(device?.is_online && device?.is_on);
    const hasEcgRaw = numericFields.includes("ecg_raw");
    const hasRPeak = numericFields.includes("r_peak");
    const hasRrIntervalMs = numericFields.includes("rr_interval_ms");
    const hasRrInterval = numericFields.includes("rr_interval");
    const ecgBeatMarkers = isEcgDevice && hasEcgRaw && hasRPeak
        ? chartData.filter((p) => Number(p.r_peak) >= 1).map((p) => p.ts)
        : [];

    const latestHeartRate = toNumberIfNumeric(latestReadings.heart_rate);
    const latestEcgRaw = toNumberIfNumeric(latestReadings.ecg_raw);
    const latestRPeak = toNumberIfNumeric(latestReadings.r_peak);
    const latestRrMs = toNumberIfNumeric(latestReadings.rr_interval_ms) ?? (
        toNumberIfNumeric(latestReadings.rr_interval) !== null
            ? Math.round(Number(latestReadings.rr_interval) * 1000)
            : null
    );
    const latestRrSec = latestRrMs !== null ? (latestRrMs / 1000).toFixed(3) : null;
    const latestRhythm = latestReadings.status ? String(latestReadings.status) : "Unknown";
    const latestLeadState = latestRhythm === "LEADS_OFF" ? "Leads Off" : "Leads On";
    const lastEcgSample = chartData.at(-1);
    const rrTrendData = isEcgDevice
        ? chartData
            .filter((p) => (hasRrIntervalMs && Number(p.rr_interval_ms) > 0) || (hasRrInterval && Number(p.rr_interval) > 0))
            .map((p) => ({
                ts: p.ts,
                fullTime: p.fullTime,
                rr_ms: hasRrIntervalMs ? Number(p.rr_interval_ms) : Math.round(Number(p.rr_interval) * 1000),
            }))
        : [];
    const ecgSaturationRatio = isEcgDevice && hasEcgRaw && chartData.length > 0
        ? chartData.filter((p) => Number(p.ecg_raw) >= 4090 || Number(p.ecg_raw) <= 5).length / chartData.length
        : 0;
    const ecgLikelySaturated = ecgSaturationRatio >= 0.6;
    const historyHint = isLiveSensorStream
        ? "Receiving live stream."
        : `No live stream. Showing stored history${latestPacketTime ? ` up to ${latestPacketTime}` : ""}.`;

    return (
        <div className="card">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Sensor History</h3>
                <span className="text-xs text-text-muted">
                    {device?.is_on ? "Device ON" : "Device OFF"}
                </span>
            </div>
            <div className={`mb-4 rounded-lg border px-3 py-2 text-xs ${
                isLiveSensorStream
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-700"
                    : "border-slate-300 bg-slate-100 text-slate-600"
            }`}>
                {historyHint}
            </div>
            {ecgLikelySaturated && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ECG signal looks saturated (near ADC limits). Check AD8232 wiring, common GND, electrode contact, and ECG input pin mapping.
                </div>
            )}

            {metaEntries.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    {metaEntries.slice(0, 8).map(([key, value]) => (
                        <div key={key} className="rounded-lg border border-border-subtle bg-surface-2/50 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-text-muted">{normalizeLabel(key)}</p>
                            <p className="truncate text-sm font-semibold text-text-primary">{String(value)}</p>
                        </div>
                    ))}
                </div>
            )}

            {isEcgDevice && (
                <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
                    <EcgTile label="Heart Rate" value={latestHeartRate !== null ? `${latestHeartRate} bpm` : "-"} />
                    <EcgTile label="RR Interval" value={latestRrMs !== null ? `${latestRrMs} ms` : "-"} />
                    <EcgTile label="RR (Seconds)" value={latestRrSec !== null ? `${latestRrSec} s` : "-"} />
                    <EcgTile label="Rhythm Status" value={latestRhythm} />
                    <EcgTile label="Lead State" value={latestLeadState} />
                    <EcgTile label="ECG Raw" value={latestEcgRaw !== null ? String(latestEcgRaw) : (lastEcgSample?.ecg_raw ?? "-")} />
                </div>
            )}

            {numericFields.length === 0 ? (
                <div className="flex h-56 items-center justify-center rounded-xl border border-border-subtle bg-surface-2/30 text-sm text-text-muted">
                    No numeric telemetry fields found in current payload.
                </div>
            ) : isEcgDevice && hasEcgRaw ? (
                <div className="space-y-3">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 6" vertical={false} />
                            <XAxis
                                dataKey="ts"
                                type="number"
                                scale="time"
                                domain={["dataMin", "dataMax"]}
                                tickCount={8}
                                tickFormatter={(v) => format(new Date(v), "HH:mm:ss")}
                                tick={{ fill: "#6B7280", fontSize: 10 }}
                                tickLine={false}
                            />
                            <YAxis
                                domain={["dataMin - 20", "dataMax + 20"]}
                                tick={{ fill: "#6B7280", fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                labelStyle={{ color: "#9CA3AF" }}
                                itemStyle={{ color: "#111827" }}
                                contentStyle={{
                                    borderRadius: "10px",
                                    border: "none",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                    background: "#ffffff",
                                }}
                                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? "-"}
                                formatter={(val, key) => [val, normalizeLabel(String(key))]}
                            />
                            {ecgBeatMarkers.map((t, idx) => (
                                <ReferenceLine
                                    key={`beat-${idx}`}
                                    x={t}
                                    stroke="#00E676"
                                    strokeWidth={1.5}
                                    ifOverflow="extendDomain"
                                />
                            ))}
                            <Line
                                type="linear"
                                dataKey="ecg_raw"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                                connectNulls
                            />
                        </LineChart>
                    </ResponsiveContainer>
                    {rrTrendData.length > 0 && (
                        <ResponsiveContainer width="100%" height={170}>
                            <LineChart data={rrTrendData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
                                <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 6" vertical={false} />
                                <XAxis
                                    dataKey="ts"
                                    type="number"
                                    scale="time"
                                    domain={["dataMin", "dataMax"]}
                                    tickCount={8}
                                    tickFormatter={(v) => format(new Date(v), "HH:mm:ss")}
                                    tick={{ fill: "#6B7280", fontSize: 10 }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={["dataMin - 30", "dataMax + 30"]}
                                    tick={{ fill: "#6B7280", fontSize: 10 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    labelStyle={{ color: "#9CA3AF" }}
                                    itemStyle={{ color: "#111827" }}
                                    contentStyle={{
                                        borderRadius: "10px",
                                        border: "none",
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                        background: "#ffffff",
                                    }}
                                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? "-"}
                                    formatter={(val) => [`${val} ms`, "RR Interval"]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="rr_ms"
                                    stroke="#0EA5E9"
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                    connectNulls
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            ) : isEcgDevice && rrTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={rrTrendData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 6" vertical={false} />
                        <XAxis
                            dataKey="ts"
                            type="number"
                            scale="time"
                            domain={["dataMin", "dataMax"]}
                            tickCount={8}
                            tickFormatter={(v) => format(new Date(v), "HH:mm:ss")}
                            tick={{ fill: "#6B7280", fontSize: 10 }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={["dataMin - 30", "dataMax + 30"]}
                            tick={{ fill: "#6B7280", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            labelStyle={{ color: "#9CA3AF" }}
                            itemStyle={{ color: "#111827" }}
                            contentStyle={{
                                borderRadius: "10px",
                                border: "none",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                background: "#ffffff",
                            }}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? "-"}
                            formatter={(val) => [`${val} ms`, "RR Interval"]}
                        />
                        <Line
                            type="monotone"
                            dataKey="rr_ms"
                            stroke="#0EA5E9"
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={chartData} margin={{ top: 6, right: 14, left: 0, bottom: 0 }}>
                        <defs>
                            {numericFields.map((field, idx) => (
                                <linearGradient key={field} id={`color-${field}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={AREA_COLORS[idx % AREA_COLORS.length]} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={AREA_COLORS[idx % AREA_COLORS.length]} stopOpacity={0} />
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="2 6" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} />
                        <YAxis
                            domain={["dataMin - 5", "dataMax + 5"]}
                            tick={{ fill: "#6B7280", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            labelStyle={{ color: "#9CA3AF" }}
                            itemStyle={{ color: "#E5E7EB" }}
                            contentStyle={{
                                borderRadius: "10px",
                                border: "none",
                                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                                background: "#ffffff",
                            }}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? "-"}
                            formatter={(val, key) => [val, normalizeLabel(String(key))]}
                        />
                        <Legend formatter={(value) => normalizeLabel(String(value))} wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                        {numericFields.map((field, idx) => (
                            <Area
                                key={field}
                                type="monotone"
                                dataKey={field}
                                stroke={AREA_COLORS[idx % AREA_COLORS.length]}
                                fill={`url(#color-${field})`}
                                strokeWidth={2}
                                connectNulls
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

function EcgTile({ label, value }) {
    return (
        <div className="rounded-lg border border-border-subtle bg-surface-2/50 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{label}</p>
            <p className="truncate text-sm font-semibold text-text-primary">{value}</p>
        </div>
    );
}
