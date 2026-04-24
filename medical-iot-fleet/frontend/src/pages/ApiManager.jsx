import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Copy, RefreshCw, Trash2, TestTube2, ChevronDown, ChevronRight } from "lucide-react";
import { getApiKeys, regenerateKey, getExampleCode, testWebhook, removeWebhook } from "../api/apikeys";
import { setWebhook } from "../api/deviceApi";
import LoadingSpinner from "../components/common/LoadingSpinner";
import toast from "react-hot-toast";

function formatExampleLabel(label) {
    return label
        .replace(/_/g, " ")
        .replace(/\bapi\b/gi, "API")
        .replace(/\besp32\b/gi, "ESP32")
        .replace(/\bcurl\b/gi, "cURL");
}

export default function ApiManager() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [examples, setExamples] = useState({});
    const [webhookInputs, setWebhookInputs] = useState({});
    const { user } = useAuth();
    if (user?.role !== "admin") {
        return <Navigate to="/" replace />;
    }

    const fetchKeys = async () => {
        try {
            setLoading(true);
            const res = await getApiKeys();
            setKeys(res.data);
        } catch { toast.error("Failed to load API keys"); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchKeys(); }, []);

    const copy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    const handleRegenerate = async (deviceId) => {
        if (!confirm("Regenerate API key? The old key will stop working immediately.")) return;
        try {
            await regenerateKey(deviceId);
            toast.success("API key regenerated");
            fetchKeys();
        } catch { toast.error("Failed to regenerate key"); }
    };

    const handleExpand = async (deviceId) => {
        if (expanded === deviceId) { setExpanded(null); return; }
        setExpanded(deviceId);
        if (!examples[deviceId]) {
            try {
                const res = await getExampleCode(deviceId);
                setExamples((prev) => ({ ...prev, [deviceId]: res.data }));
            } catch { /* silent */ }
        }
    };

    const handleSetWebhook = async (deviceId) => {
        const url = webhookInputs[deviceId];
        if (!url) return toast.error("Enter a webhook URL");
        try {
            await setWebhook(deviceId, url);
            toast.success("Webhook configured");
            fetchKeys();
        } catch { toast.error("Failed to set webhook"); }
    };

    const handleRemoveWebhook = async (deviceId) => {
        try {
            await removeWebhook(deviceId);
            toast.success("Webhook removed");
            fetchKeys();
        } catch { toast.error("Failed to remove webhook"); }
    };

    const handleTestWebhook = async (deviceId) => {
        try {
            const res = await testWebhook(deviceId);
            toast.success(`Test sent - response: HTTP ${res.data.response_code}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Webhook test failed");
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-bold text-text-primary">API Manager</h1>
                <p className="text-sm text-text-muted">
                    Device API keys, integration code, and webhook configuration
                </p>
            </div>

            {keys.length === 0 ? (
                <div className="py-20 text-center text-text-muted">
                    <p>No devices registered yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map((item) => (
                        <div key={item.device_id} className="card border border-border-subtle">
                            <div
                                className="flex cursor-pointer items-center justify-between"
                                onClick={() => handleExpand(item.device_id)}
                            >
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">{item.name}</p>
                                    <p className="text-xs text-text-muted">
                                        {item.device_type} <span className="mx-1">·</span>
                                        <span className="font-mono">{item.device_id}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-2 px-3 py-1.5">
                                        <span className="max-w-[140px] truncate font-mono text-xs text-primary-light">
                                            {item.api_key}
                                        </span>
                                        <button onClick={(e) => { e.stopPropagation(); copy(item.api_key); }} className="text-text-muted hover:text-text-primary">
                                            <Copy size={12} />
                                        </button>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleRegenerate(item.device_id); }} className="p-1 text-text-muted transition-colors hover:text-warning-light">
                                        <RefreshCw size={14} />
                                    </button>
                                    {expanded === item.device_id
                                        ? <ChevronDown size={16} className="text-text-muted" />
                                        : <ChevronRight size={16} className="text-text-muted" />}
                                </div>
                            </div>

                            {expanded === item.device_id && (
                                <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
                                    <div>
                                        <p className="mb-2 text-xs font-medium text-text-secondary">Webhook URL</p>
                                        <div className="flex gap-2">
                                            <input
                                                className="input flex-1 text-xs"
                                                placeholder="https://example.com/webhook"
                                                defaultValue={item.webhook_url || ""}
                                                onChange={(e) => setWebhookInputs({ ...webhookInputs, [item.device_id]: e.target.value })}
                                            />
                                            <button onClick={() => handleSetWebhook(item.device_id)} className="btn-primary px-3 text-xs">
                                                Save
                                            </button>
                                            {item.webhook_url && (
                                                <>
                                                    <button onClick={() => handleTestWebhook(item.device_id)} className="btn-secondary flex items-center gap-1 px-3 text-xs">
                                                        <TestTube2 size={12} /> Test
                                                    </button>
                                                    <button onClick={() => handleRemoveWebhook(item.device_id)} className="btn-danger px-3 text-xs">
                                                        <Trash2 size={12} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {examples[item.device_id] && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium text-text-secondary">Integration Examples</p>
                                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                                {Object.entries(examples[item.device_id].examples).map(([lang, code]) => (
                                                    <div key={lang} className="overflow-hidden rounded-xl border border-border-subtle bg-bg-alt">
                                                        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-section px-3 py-2">
                                                            <span className="font-mono text-xs text-text-secondary">{formatExampleLabel(lang)}</span>
                                                            <button onClick={() => copy(code)} className="text-text-muted hover:text-text-primary">
                                                                <Copy size={11} />
                                                            </button>
                                                        </div>
                                                        <pre className="overflow-x-auto whitespace-pre-wrap p-3 text-xs leading-relaxed text-primary-light">
                                                            {code}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
