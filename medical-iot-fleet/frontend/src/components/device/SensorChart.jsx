import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const LINE_COLORS = ["#6366F1", "#3B82F6", "#22C55E", "#F59E0B", "#F87171"];

export default function SensorChart({ data = [] }) {
    if (!data.length) {
        return (
            <div className="card flex h-48 items-center justify-center text-sm text-text-muted">
                Waiting for sensor data...
            </div>
        );
    }

    const chartData = [...data].reverse().map((record) => {
        let readings = {};
        try { readings = JSON.parse(record.readings); } catch { /* skip */ }
        return {
            time: format(new Date(record.timestamp), "HH:mm:ss"),
            ...readings,
        };
    });

    const fields = Object.keys(chartData[0] || {}).filter((k) => k !== "time");

    return (
        <div className="card">
            <h3 className="mb-4 text-sm font-semibold text-text-primary">Live Sensor Data</h3>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: "#6B7280", fontSize: 10 }}
                        tickLine={false}
                    />
                    <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip
                        contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8 }}
                        labelStyle={{ color: "#9CA3AF" }}
                        itemStyle={{ color: "#E5E7EB" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#9CA3AF" }} />
                    {fields.map((field, i) => (
                        <Line
                            key={field}
                            type="monotone"
                            dataKey={field}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            dot={false}
                            strokeWidth={2}
                            activeDot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
