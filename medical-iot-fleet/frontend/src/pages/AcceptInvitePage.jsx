import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { registerWithInvite, validateInvite } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import SafeIoTShowcase from "../components/auth/SafeIoTShowcase";
import { SUPPORT_EMAIL } from "../utils/env";

const inputClass = "w-full rounded-[10px] border border-[#E5E7EB] bg-white/60 px-3 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#0EA5E9] focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]";

export default function AcceptInvitePage() {
    const navigate = useNavigate();
    const { login, user, logout } = useAuth();
    const [params] = useSearchParams();
    const token = params.get("token") || "";

    const [verifying, setVerifying] = useState(true);
    const [invalidInvite, setInvalidInvite] = useState(false);
    const [inviteMeta, setInviteMeta] = useState(null);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "" });

    useEffect(() => {
        if (!token) {
            setInvalidInvite(true);
            setVerifying(false);
            return;
        }
        validateInvite(token)
            .then((res) => {
                setInviteMeta(res.data);
                setForm((prev) => ({ ...prev, email: res.data.email || "" }));
            })
            .catch(() => {
                setInvalidInvite(true);
            })
            .finally(() => setVerifying(false));
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error("Please fill all fields");
            return;
        }
        setLoading(true);
        try {
            const res = await registerWithInvite(
                { name: form.name, email: form.email, password: form.password },
                token,
            );
            login(res.data.access_token, res.data.user);
            navigate("/");
        } catch (err) {
            const detail = String(err.response?.data?.detail || "");
            if (detail.toLowerCase().includes("expired") || detail.toLowerCase().includes("invalid")) {
                setInvalidInvite(true);
                toast.error("This invite link is no longer valid");
            } else {
                toast.error("Unable to complete signup. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="relative min-h-screen overflow-hidden"
            style={{ background: "linear-gradient(135deg, #5EEAD4 0%, #60A5FA 100%)" }}
        >
            <div className="pointer-events-none absolute -left-28 -top-28 h-[460px] w-[460px] rounded-full bg-cyan-200/30 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-36 right-10 h-[500px] w-[500px] rounded-full bg-sky-300/25 blur-[110px]" />

            <div className="relative z-10 flex min-h-screen items-center justify-end px-6 md:px-12 lg:px-16 xl:px-20">
                <div className="mr-auto hidden lg:flex lg:items-center lg:justify-center lg:origin-center lg:scale-[0.78] xl:scale-100">
                    <SafeIoTShowcase />
                </div>

                <div className="flex w-full max-w-[420px] flex-col items-center py-8">
                    <div className="w-full rounded-2xl border border-white/40 bg-white/75 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-[12px] md:p-7">
                        <h1 className="mb-1 text-xl font-bold text-gray-900">Accept Invitation</h1>
                        <p className="mb-6 text-sm text-gray-600">Create your account using your invite link.</p>

                        {user ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-700">
                                    You are currently logged in as <span className="font-semibold">{user.email}</span>.
                                    Please sign out first to accept this invite.
                                </p>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="w-full rounded-[10px] bg-[linear-gradient(90deg,#14B8A6,#0EA5E9)] py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-105"
                                >
                                    Sign Out And Continue
                                </button>
                            </div>
                        ) : verifying ? (
                            <p className="text-sm text-gray-600">Validating invitation...</p>
                        ) : invalidInvite ? (
                            <div className="space-y-4">
                                <p className="text-sm text-red-600">This invite link is invalid or expired.</p>
                                <p className="text-xs text-gray-600">
                                    Ask your admin to resend a fresh invite link.
                                </p>
                                <div className="flex flex-wrap gap-3">
                                    <Link to="/login" className="inline-block text-sm font-semibold text-sky-700 hover:underline">
                                        Go to Login
                                    </Link>
                                    <a
                                        href={`mailto:${SUPPORT_EMAIL}?subject=Request%20new%20invite%20link`}
                                        className="inline-block text-sm font-semibold text-slate-700 hover:underline"
                                    >
                                        Contact Admin
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                                    Role: <span className="font-semibold capitalize">{inviteMeta?.role}</span>
                                    {inviteMeta?.assigned_floor ? ` | Floor: ${inviteMeta.assigned_floor}` : ""}
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Full Name</label>
                                    <input
                                        className={inputClass}
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Email</label>
                                    <input
                                        className={inputClass}
                                        type="email"
                                        value={form.email}
                                        readOnly
                                        disabled
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Password</label>
                                    <input
                                        className={inputClass}
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="mt-2 w-full rounded-[10px] bg-[linear-gradient(90deg,#14B8A6,#0EA5E9)] py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {loading ? "Please wait..." : "Create Account"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
