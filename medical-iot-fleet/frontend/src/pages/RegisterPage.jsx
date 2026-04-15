import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Github } from "lucide-react";

import { registerUser, googleLoginUrl, githubLoginUrl } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import SafeIoTShowcase from "../components/auth/SafeIoTShowcase";
import toast from "react-hot-toast";

const inputClass = "w-full rounded-[10px] border border-[#E5E7EB] bg-white/60 px-3 py-2.5 text-sm text-gray-900 outline-none transition-all duration-200 focus:border-[#0EA5E9] focus:shadow-[0_0_0_3px_rgba(14,165,233,0.15)]";
const socialBtnClass = "flex w-full items-center justify-center gap-3 rounded-[10px] border border-[#E5E7EB] bg-white py-2.5 text-sm font-medium text-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 hover:bg-[#F9FAFB]";

export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "" });

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!form.name || !form.email || !form.password) {
            toast.error("Please fill all the above details");
            return;
        }
        setLoading(true);
        try {
            const res = await registerUser(form);
            login(res.data.access_token, res.data.user);
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Registration failed");
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
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.08]"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            <div className="relative z-10 flex min-h-screen items-center justify-end px-6 md:px-12 lg:px-16 xl:px-20">
                <div className="mr-auto hidden lg:flex lg:items-center lg:justify-center lg:origin-center lg:scale-[0.78] xl:scale-100">
                    <SafeIoTShowcase />
                </div>
                <div className="flex w-full max-w-[420px] flex-col items-center py-8">
                    <div className="w-full rounded-2xl border border-white/40 bg-white/75 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-[12px] transition-all duration-200 hover:shadow-[0_26px_48px_rgba(0,0,0,0.10)] md:p-7">
                        <div className="mb-6 flex rounded-full bg-[#F1F5F9] p-1">
                            <Link
                                to="/login"
                                className="flex-1 rounded-full py-2 text-center text-sm font-semibold text-gray-500 transition-all duration-200 hover:text-gray-700"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="flex-1 rounded-full bg-white py-2 text-center text-sm font-semibold text-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-all duration-200"
                            >
                                Register
                            </Link>
                        </div>

                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                                Hospital setup usually uses invite-only signup. Ask your admin for an invite link.
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
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
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

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-[10px] bg-[linear-gradient(90deg,#14B8A6,#0EA5E9)] py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:brightness-105 hover:-translate-y-[1px] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {loading ? "Please wait..." : "Create Account"}
                                </button>
                            </div>
                        </form>

                        <div className="my-6 flex items-center gap-4">
                            <div className="h-px flex-1 bg-gray-300/70" />
                            <span className="text-xs font-medium text-gray-500">or continue with</span>
                            <div className="h-px flex-1 bg-gray-300/70" />
                        </div>

                        <div className="space-y-3">
                            <a href={googleLoginUrl()} className={socialBtnClass}>
                                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </a>

                            <a href={githubLoginUrl()} className={socialBtnClass}>
                                <Github size={18} />
                                Continue with GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
