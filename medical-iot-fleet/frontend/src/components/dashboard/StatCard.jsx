export default function StatCard({ label, value, icon: Icon, color = "primary" }) {
    const styles = {
        primary: { wrap: "bg-indigo-50", icon: "text-indigo-600" },
        green: { wrap: "bg-emerald-50", icon: "text-emerald-600" },
        slate: { wrap: "bg-gray-100", icon: "text-gray-600" },
        yellow: { wrap: "bg-amber-50", icon: "text-amber-600" },
    };

    const s = styles[color] || styles.primary;

    return (
        <div className="bg-white rounded-2xl p-6 border border-[#E5E7EB] shadow-[0_4px_12px_rgba(0,0,0,0.02)] flex items-center gap-4 transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-0.5">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.wrap}`}>
                <Icon size={24} className={s.icon} strokeWidth={2} />
            </div>
            <div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight leading-none mb-1">
                    {value ?? "—"}
                </p>
                <p className="text-sm font-medium text-gray-500">
                    {label}
                </p>
            </div>
        </div>
    );
}
