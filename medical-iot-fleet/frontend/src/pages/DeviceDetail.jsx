import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Clock, Cpu, Download } from "lucide-react";
import ControlPanel from "../components/device/ControlPanel";
import SensorChart from "../components/device/SensorChart";
import ConfidenceMeter from "../components/device/ConfidenceMeter";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { getDevice } from "../api/deviceApi";
import { getSensorData, exportSensorData } from "../api/sensorApi";
import { useWebSocket } from "../hooks/useWebSocket";
import { timeAgo, fmtDate } from "../utils/formatters";
import toast from "react-hot-toast";

export default function DeviceDetail() {
    const { deviceId } = useParams();
    const navigate = useNavigate();

    const [device, setDevice] = useState(null);
    const [sensorData, setSensorData] = useState([]);
    const [telemetryMeta, setTelemetryMeta] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastReading, setLastReading] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [exportFilters, setExportFilters] = useState({
        limit: 500,
        from_datetime: "",
        to_datetime: "",
        time_slot_start: "",
        time_slot_end: "",
    });
    const { connected } = useWebSocket();

    const fetchDevice = useCallback(async () => {
        try {
            const [devRes, dataRes] = await Promise.all([
                getDevice(deviceId),
                getSensorData(deviceId, 50),
            ]);
            setDevice(devRes.data);
            setSensorData(dataRes.data.records || []);
            setTelemetryMeta(dataRes.data.telemetry_meta || null);
            if ((dataRes.data.records || []).length) setLastReading(dataRes.data.records[0]);
        } catch { /* device not found */ }
        finally { setLoading(false); }
    }, [deviceId]);

    useEffect(() => { fetchDevice(); }, [fetchDevice]);

    // Periodic reconciliation poll:
    // - every 15s when WS is connected (prevents stale UI if an event is missed)
    // - every 5s when WS is disconnected
    useEffect(() => {
        const intervalMs = connected ? 15000 : 5000;
        const timer = setInterval(() => {
            fetchDevice();
        }, intervalMs);
        return () => clearInterval(timer);
    }, [connected, fetchDevice]);

    useWebSocket("device_update", useCallback((msg) => {
        if (msg.device_id !== deviceId) return;
        if (msg.readings && typeof msg.readings === "object") {
            const newRecord = {
                id: Date.now(),
                readings: JSON.stringify(msg.readings),
                confidence_score: msg.confidence_score,
                is_anomaly: msg.is_anomaly ? 1 : 0,
                timestamp: msg.timestamp,
            };
            setSensorData((prev) => [newRecord, ...prev].slice(0, 100));
            setLastReading(newRecord);
            if (msg.telemetry_meta) setTelemetryMeta(msg.telemetry_meta);
        }
        setDevice((prev) =>
            prev ? {
                ...prev,
                ...(typeof msg.is_online === "boolean" ? { is_online: msg.is_online } : {}),
                ...(msg.connection_state ? { connection_state: msg.connection_state } : {}),
                ...(msg.data_state ? { data_state: msg.data_state } : {}),
                ...(msg.presence_source ? { presence_source: msg.presence_source } : {}),
                ...(msg.last_status_at ? { last_status_at: msg.last_status_at } : {}),
                ...(msg.last_data_at ? { last_data_at: msg.last_data_at } : {}),
                ...(msg.timestamp ? { last_seen: msg.timestamp } : {}),
            } : prev
        );
    }, [deviceId]));

    useWebSocket("state_change", useCallback((msg) => {
        if (msg.device_id !== deviceId) return;
        setDevice((prev) => prev ? { ...prev, is_on: msg.is_on } : prev);
    }, [deviceId]));

    if (loading) return <LoadingSpinner />;
    if (!device) {
        return (
            <div className="py-20 text-center text-text-muted">
                <p>Device not found</p>
                <button onClick={() => navigate("/")} className="btn-secondary mt-4">Back to Dashboard</button>
            </div>
        );
    }

    const lastReadings = lastReading ? (() => {
        try { return JSON.parse(lastReading.readings); } catch { return {}; }
    })() : {};
    const excludedFields = new Set(telemetryMeta?.excluded_fields || []);
    const fieldConfig = telemetryMeta?.field_config || {};
    const latestReadingEntries = Object.entries(lastReadings).filter(([key]) => key !== "timestamp" && !excludedFields.has(key));

    const deviceStatusLabel = getDeviceStatusLabel(device);
    const deviceStatusClass = getDeviceStatusClass(device);

    const handleExport = async (format) => {
        try {
            setExporting(true);
            const params = {
                format,
                limit: Number(exportFilters.limit) || 500,
            };
            if (exportFilters.from_datetime) params.from_datetime = exportFilters.from_datetime;
            if (exportFilters.to_datetime) params.to_datetime = exportFilters.to_datetime;
            if (exportFilters.time_slot_start) params.time_slot_start = exportFilters.time_slot_start;
            if (exportFilters.time_slot_end) params.time_slot_end = exportFilters.time_slot_end;

            const response = await exportSensorData(deviceId, params);
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `${deviceId}_telemetry_${timestamp}.${format}`;

            if (format === "json") {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: "application/json" });
                downloadBlob(blob, filename);
            } else {
                const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
                downloadBlob(blob, filename);
            }
            toast.success(`${format.toUpperCase()} export ready`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Export failed");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-text-primary">{device.name}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${deviceStatusClass}`}>
                            {deviceStatusLabel}
                        </span>
                    </div>
                    <p className="text-sm text-text-muted">
                        {device.device_type} <span className="mx-1">·</span>
                        <span className="font-mono">{device.device_id}</span>
                    </p>
                </div>
                <button onClick={fetchDevice} className="text-text-secondary transition-colors hover:text-primary-light">
                    <RefreshCw size={16} />
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="card space-y-3">
                    <h3 className="text-sm font-semibold text-text-primary">Device Info</h3>
                    <InfoRow icon={Cpu} label="Type" value={device.device_type} />
                    <InfoRow icon={Clock} label="Connection" value={device.connection_state || "unknown"} />
                    <InfoRow icon={Clock} label="Data State" value={device.data_state || "unknown"} />
                    <InfoRow icon={Clock} label="Last Data" value={timeAgo(device.last_data_at || device.last_seen)} />
                    <InfoRow icon={Clock} label="Last Status" value={timeAgo(device.last_status_at)} />
                    <InfoRow icon={Cpu} label="Firmware" value={device.firmware_version} />
                    <InfoRow icon={Clock} label="Registered" value={fmtDate(device.created_at)} />

                    {latestReadingEntries.length > 0 && (
                        <div className="border-t border-border-subtle pt-2">
                            <p className="mb-2 text-xs text-text-muted">Latest Readings</p>
                            <div className="grid grid-cols-2 gap-2">
                                {latestReadingEntries.map(([k, v]) => (
                                    <div key={k} className="rounded-lg bg-surface-2 p-2 text-center">
                                        <p className="text-xs capitalize text-text-secondary">{fieldConfig[k]?.label || k.replace("_", " ")}</p>
                                        <p className="text-base font-bold text-primary-light">{v}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <ControlPanel device={device} onUpdated={fetchDevice} />

                <ConfidenceMeter
                    score={lastReading?.confidence_score}
                    isAnomaly={lastReading?.is_anomaly === 1}
                />
            </div>

            <div className="card space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-text-primary">Export Device Data</h3>
                        <p className="text-xs text-text-muted">Download telemetry for this device only using latest N records, date range, and time slot filters.</p>
                    </div>
                    <Download size={16} className="text-text-secondary" />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Latest N Records</label>
                        <input
                            type="number"
                            min="1"
                            max="5000"
                            className="input"
                            value={exportFilters.limit}
                            onChange={(e) => setExportFilters((prev) => ({ ...prev, limit: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">From</label>
                        <input
                            type="datetime-local"
                            className="input"
                            value={exportFilters.from_datetime}
                            onChange={(e) => setExportFilters((prev) => ({ ...prev, from_datetime: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">To</label>
                        <input
                            type="datetime-local"
                            className="input"
                            value={exportFilters.to_datetime}
                            onChange={(e) => setExportFilters((prev) => ({ ...prev, to_datetime: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Time Slot Start</label>
                        <input
                            type="time"
                            className="input"
                            value={exportFilters.time_slot_start}
                            onChange={(e) => setExportFilters((prev) => ({ ...prev, time_slot_start: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-text-secondary">Time Slot End</label>
                        <input
                            type="time"
                            className="input"
                            value={exportFilters.time_slot_end}
                            onChange={(e) => setExportFilters((prev) => ({ ...prev, time_slot_end: e.target.value }))}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => handleExport("csv")}
                        disabled={exporting}
                        className="btn-primary"
                    >
                        {exporting ? "Exporting..." : "Export CSV"}
                    </button>
                    <button
                        onClick={() => handleExport("json")}
                        disabled={exporting}
                        className="btn-secondary"
                    >
                        {exporting ? "Exporting..." : "Export JSON"}
                    </button>
                </div>
            </div>

            <SensorChart data={sensorData} device={device} telemetryMeta={telemetryMeta} />
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{label}</span>
            <span className="font-medium text-text-primary">{value ?? "—"}</span>
        </div>
    );
}

function getDeviceStatusLabel(device) {
    if (device.connection_state === "connected" && device.data_state === "fresh") return "Receiving live data";
    if (device.connection_state === "connected" && device.data_state === "stale") return "Connected, data stale";
    if (device.connection_state === "connected") return "Connected";
    if (device.connection_state === "unknown" && device.data_state === "fresh") return "Legacy telemetry";
    return "Disconnected";
}

function getDeviceStatusClass(device) {
    if (device.connection_state === "connected" && device.data_state === "fresh") return "badge-online";
    if (device.connection_state === "connected" && device.data_state === "stale") return "bg-amber-100 text-amber-700";
    if (device.connection_state === "connected") return "bg-teal-100 text-teal-700";
    if (device.connection_state === "unknown" && device.data_state === "fresh") return "bg-sky-100 text-sky-700";
    return "badge-offline";
}

function downloadBlob(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
}
