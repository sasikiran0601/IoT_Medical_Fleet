import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse, Github } from "lucide-react";
import { loginLocal, googleLoginUrl, githubLoginUrl } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [tab, setTab] = useState("login");
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ name: "", email: "", password: "", role: "nurse" });

    const handleLocal = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await loginLocal(form.email, form.password);
            login(res.data.access_token, res.data.user);
            navigate("/");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { registerUser } = await import("../api/authApi");
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
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] p-4 font-sans">
            
            {/* Header / Logo Section */}
            <div className="mb-8 text-center flex flex-col items-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 shadow-sm ring-1 ring-inset ring-indigo-100">
                    <HeartPulse size={32} className="text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Medical IoT Fleet</h1>
                <p className="mt-2 text-sm text-gray-500">Hospital Device Management System</p>
            </div>

            {/* Auth Card */}
            <div className="w-full max-w-[400px] bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
                
                {/* Tabs */}
                <div className="mb-6 flex rounded-full bg-gray-50 p-1 border border-gray-200">
                    {["login", "register"].map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTab(t)}
                            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-all duration-200 ${
                                tab === t 
                                ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200" 
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={tab === "login" ? handleLocal : handleRegister} className="space-y-4">
                    {tab === "register" && (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Full Name</label>
                            <input
                                className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700">Email</label>
                        <input
                            className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-semibold text-gray-700">Password</label>
                        <input
                            className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    {tab === "register" && (
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-gray-700">Role</label>
                            <select
                                className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="nurse">Nurse</option>
                                <option value="doctor">Doctor</option>
                                <option value="viewer">Viewer</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="mt-6 w-full rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                        {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
                    </button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-gray-200" />
                    <span className="text-xs font-medium text-gray-400">or continue with</span>
                    <div className="h-px flex-1 bg-gray-200" />
                </div>

                {/* OAuth Buttons */}
                <div className="space-y-3">
                    <a
                        href={googleLoginUrl()}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Continue with Google
                    </a>

                    <a
                        href={githubLoginUrl()}
                        className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1"
                    >
                        <Github size={18} />
                        Continue with GitHub
                    </a>
                </div>
            </div>
        </div>
    );
}
