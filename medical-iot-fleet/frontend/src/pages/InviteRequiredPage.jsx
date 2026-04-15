import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../utils/env";

export default function InviteRequiredPage() {
    return (
        <div
            className="relative min-h-screen overflow-hidden"
            style={{ background: "linear-gradient(135deg, #5EEAD4 0%, #60A5FA 100%)" }}
        >
            <div className="pointer-events-none absolute -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-cyan-200/30 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-36 right-10 h-[500px] w-[500px] rounded-full bg-sky-300/25 blur-[110px]" />

            <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
                <div className="w-full max-w-[460px] rounded-2xl border border-white/40 bg-white/75 p-7 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-[12px]">
                    <h1 className="text-xl font-bold text-gray-900">Invite Required</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Public signup is disabled for hospital security. Please use the invite link shared by your hospital admin.
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                        If your invite expired, request a new one from IT support.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to="/login"
                            className="rounded-[10px] bg-[linear-gradient(90deg,#14B8A6,#0EA5E9)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                        >
                            Go To Login
                        </Link>
                        <a
                            href={`mailto:${SUPPORT_EMAIL}?subject=Request%20for%20Hospital%20App%20Invite`}
                            className="rounded-[10px] border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Contact Admin
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
