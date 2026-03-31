import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Clock, Cpu } from "lucide-react";
import ControlPanel from "../components/device/ControlPanel";
import SensorChart from "../components/device/SensorChart";
import ConfidenceMeter from "../components/device/ConfidenceMeter";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { getDevice } from "../api/deviceApi";
import { getSensorData } from "../api/sensorApi";
import { useWebSocket } from "../hooks/useWebSocket";
import { timeAgo, fmtDate } from "../utils/formatters";

export default function DeviceDetail() {
    const { deviceId } = useParams();
    const navigate = useNavigate();

    const [device, setDevice] = useState(null);
    const [sensorData, setSensorData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastReading, setLastReading] = useState(null);

    const fetchDevice = async () => {
        try {
            const [devRes, dataRes] = await Promise.all([
                getDevice(deviceId),
                getSensorData(deviceId, 50),
            ]);
            setDevice(devRes.data);
            setSensorData(dataRes.data);
            if (dataRes.data.length) setLastReading(dataRes.data[0]);
        } catch { /* device not found */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchDevice(); }, [deviceId]);

    useWebSocket("sensor_data", useCallback((msg) => {
        if (msg.device_id !== deviceId) return;
        const newRecord = {
            id: Date.now(),
            readings: JSON.stringify(msg.readings),
            confidence_score: msg.confidence_score,
            is_anomaly: msg.is_anomaly ? 1 : 0,
            timestamp: msg.timestamp,
        };
        setSensorData((prev) => [newRecord, ...prev].slice(0, 100));
        setLastReading(newRecord);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-text-secondary hover:text-text-primary">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-text-primary">{device.name}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${device.is_online ? "badge-online" : "badge-offline"}`}>
                            {device.is_online ? "Online" : "Offline"}
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
                    <InfoRow icon={Clock} label="Last Seen" value={timeAgo(device.last_seen)} />
                    <InfoRow icon={Cpu} label="Firmware" value={device.firmware_version} />
                    <InfoRow icon={Clock} label="Registered" value={fmtDate(device.created_at)} />

                    {Object.keys(lastReadings).length > 0 && (
                        <div className="border-t border-border-subtle pt-2">
                            <p className="mb-2 text-xs text-text-muted">Latest Readings</p>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(lastReadings).map(([k, v]) => (
                                    <div key={k} className="rounded-lg bg-surface-2 p-2 text-center">
                                        <p className="text-xs capitalize text-text-secondary">{k.replace("_", " ")}</p>
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

            <SensorChart data={sensorData} />
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
