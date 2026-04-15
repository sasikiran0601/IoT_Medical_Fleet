import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    loading = false,
}) {
    useEffect(() => {
        if (!open) return;

        const onKeyDown = (event) => {
            if (event.key === "Escape" && !loading) {
                onCancel?.();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, loading, onCancel]);

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]"
            onClick={() => !loading && onCancel?.()}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_24px_50px_rgba(2,6,23,0.2)]"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                <div className="mb-4 flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <AlertTriangle size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm text-slate-600">{description}</p>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className="rounded-lg border border-rose-300 bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "Deleting..." : confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
