/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },
            colors: {
                bg: {
                    main: "#F3F4F6", /* gray-100 */
                    alt: "#F9FAFB", /* gray-50 */
                    section: "#FFFFFF",
                },
                background: {
                    DEFAULT: "#F3F4F6",
                    alt: "#F9FAFB",
                    section: "#FFFFFF",
                },
                surface: {
                    1: "#FFFFFF",
                    2: "#F8F9FA",
                    3: "#F3F4F6",
                },
                text: {
                    primary: "#111827", /* gray-900 */
                    secondary: "#4B5563", /* gray-600 */
                    muted: "#6B7280", /* gray-500 */
                    disabled: "#9CA3AF", /* gray-400 */
                },
                border: {
                    subtle: "#F3F4F6", /* gray-100 */
                    default: "#E5E7EB", /* gray-200 */
                    strong: "#D1D5DB", /* gray-300 */
                    DEFAULT: "#E5E7EB",
                },
                primary: {
                    DEFAULT: "#14B8A6", /* teal-500 */
                    hover: "#0D9488",   /* teal-600 */
                    active: "#0F766E",  /* teal-700 */
                    light: "#2DD4BF",   /* teal-400 */
                    bg: "#ECFEFF",
                    subtle: "#ECFEFF",
                },
                success: {
                    DEFAULT: "#10B981",    /* emerald-500 */
                    hover: "#059669",      /* emerald-600 */
                    light: "#34D399",      /* emerald-400 */
                    bg: "#ECFDF5",         /* emerald-50 */
                },
                accent: {
                    DEFAULT: "#10B981",
                    hover: "#059669",
                    light: "#34D399",
                    bg: "#ECFDF5",
                },
                error: {
                    DEFAULT: "#EF4444",    /* red-500 */
                    light: "#F87171",      /* red-400 */
                    bg: "#FEF2F2",         /* red-50 */
                },
                warning: {
                    DEFAULT: "#F59E0B",    /* amber-500 */
                    light: "#FBBF24",      /* amber-400 */
                    bg: "#FFFBEB",         /* amber-50 */
                },
                info: {
                    DEFAULT: "#3B82F6",    /* blue-500 */
                    light: "#60A5FA",      /* blue-400 */
                    bg: "#EFF6FF",         /* blue-50 */
                },
                semantic: {
                    error: {
                        DEFAULT: "#EF4444",
                        light: "#F87171",
                        bg: "#FEF2F2",
                    },
                    warning: {
                        DEFAULT: "#F59E0B",
                        light: "#FBBF24",
                        bg: "#FFFBEB",
                    },
                    info: {
                        DEFAULT: "#3B82F6",
                        light: "#60A5FA",
                        bg: "#EFF6FF",
                    },
                },
            },
            backgroundImage: {
                "gradient-primary": "linear-gradient(90deg, #14B8A6, #0EA5E9)",
                "gradient-accent": "linear-gradient(135deg, #10B981, #34D399)",
            },
            animation: {
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            },
            boxShadow: {
                panel: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)", /* matching light mode */
                glow: "0 4px 6px -1px rgba(20, 184, 166, 0.22)",
            },
        },
    },
    plugins: [],
};
