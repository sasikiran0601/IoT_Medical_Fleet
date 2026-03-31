import { ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { CONFIDENCE_BG, CONFIDENCE_COLOR } from "../../utils/constants";

export default function ConfidenceMeter({ score, isAnomaly }) {
    const label =
        score == null ? "No Data"
            : score >= 80 ? "HIGH - Reliable"
                : score >= 50 ? "MEDIUM - Questionable"
                    : "LOW - Unreliable";

    const Icon =
        score == null ? ShieldAlert
            : score >= 80 ? ShieldCheck
                : score >= 50 ? ShieldAlert
                    : ShieldX;

    return (
        <div className="card space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Sensor Confidence</h3>
                {isAnomaly && (
                    <span className="rounded-full bg-error/12 px-2 py-0.5 text-xs text-error-light">
                        Anomaly Detected
                    </span>
                )}
            </div>

            <div className="flex items-center gap-3">
                <Icon size={28} className={score != null ? CONFIDENCE_COLOR(score) : "text-text-muted"} />
                <div className="flex-1">
                    <div className="mb-1 flex justify-between text-xs">
                        <span className="text-text-secondary">{label}</span>
                        <span className={`font-bold ${score != null ? CONFIDENCE_COLOR(score) : "text-text-muted"}`}>
                            {score != null ? `${score}%` : "-"}
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${score != null ? CONFIDENCE_BG(score) : "bg-surface-3"}`}
                            style={{ width: score != null ? `${score}%` : "0%" }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                {[
                    { label: "High", range: ">= 80%", color: "text-success-light" },
                    { label: "Medium", range: "50-79%", color: "text-warning-light" },
                    { label: "Low", range: "< 50%", color: "text-error-light" },
                ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-surface-2 p-2">
                        <p className={`font-medium ${item.color}`}>{item.label}</p>
                        <p className="text-text-muted">{item.range}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
