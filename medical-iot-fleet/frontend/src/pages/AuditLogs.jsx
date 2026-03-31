import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import AuditTable from "../components/logs/AuditTable";
import { getAuditLogs } from "../api/logApi";

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        device_id: "", action: "", from_date: "", to_date: "",
    });

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = Object.fromEntries(
                Object.entries(filters).filter(([, v]) => v !== "")
            );
            const res = await getAuditLogs({ ...params, limit: 200 });
            setLogs(res.data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, []);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-text-primary">Audit Logs</h1>
                <p className="text-sm text-text-muted">Complete history of who did what and when</p>
            </div>

            <div className="card border border-border-subtle">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <input
                        className="input text-sm"
                        placeholder="Device ID"
                        value={filters.device_id}
                        onChange={(e) => setFilters({ ...filters, device_id: e.target.value })}
                    />
                    <select
                        className="input text-sm"
                        value={filters.action}
                        onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                    >
                        <option value="">All Actions</option>
                        <option value="TURN_ON">TURN_ON</option>
                        <option value="TURN_OFF">TURN_OFF</option>
                        <option value="REGISTERED">REGISTERED</option>
                        <option value="OTA_UPDATE">OTA_UPDATE</option>
                    </select>
                    <input
                        className="input text-sm"
                        type="date"
                        value={filters.from_date}
                        onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                    />
                    <input
                        className="input text-sm"
                        type="date"
                        value={filters.to_date}
                        onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                    />
                </div>
                <div className="mt-3 flex justify-end">
                    <button onClick={fetchLogs} className="btn-primary flex items-center gap-2 text-sm">
                        <Search size={14} /> Search
                    </button>
                </div>
            </div>

            <AuditTable logs={logs} loading={loading} />
        </div>
    );
}
