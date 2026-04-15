export default function StatCard({ label, value, icon: Icon, color = "primary" }) {
    const styles = {
        primary: { wrap: "bg-indigo-50", icon: "text-indigo-600" },
        green: { wrap: "bg-emerald-50", icon: "text-emerald-600" },
        slate: { wrap: "bg-gray-100", icon: "text-gray-600" },
        yellow: { wrap: "bg-amber-50", icon: "text-amber-600" },
    };

    const s = styles[color] || styles.primary;

    return (
        <div 
            className="bg-white flex items-center transition-all duration-200 hover:-translate-y-[2px]"
            style={{
                padding: "18px 20px",
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
                gap: "20px"
            }}
        >
            <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${s.wrap}`}>
                <Icon size={20} className={s.icon} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
                <p className="text-[32px] font-bold text-gray-900 tracking-tight leading-none mb-[6px]">
                    {value ?? "—"}
                </p>
                <p className="text-[13px] font-medium" style={{ color: "#6B7280" }}>
                    {label}
                </p>
            </div>
        </div>
    );
}
