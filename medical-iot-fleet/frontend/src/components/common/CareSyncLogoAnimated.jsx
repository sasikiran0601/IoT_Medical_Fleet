import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const BRAND_LOGO_SRC = "/brand/caresync-logo.svg";

function StaticLogo({ size, className }) {
    return (
        <img
            src={BRAND_LOGO_SRC}
            alt="CareSync logo"
            width={size}
            height={size}
            className={className}
            style={{ width: size, height: size, objectFit: "contain" }}
        />
    );
}

export default function CareSyncLogoAnimated({ collapsed, size = 40, className = "" }) {
    const prefersReducedMotion = useReducedMotion();
    const wasCollapsed = useRef(collapsed);
    const [sequenceId, setSequenceId] = useState(0);

    useEffect(() => {
        if (!wasCollapsed.current && collapsed) {
            setSequenceId((v) => v + 1);
        }
        wasCollapsed.current = collapsed;
    }, [collapsed]);

    if (!collapsed || prefersReducedMotion) {
        return <StaticLogo size={size} className={className} />;
    }

    const gradientId = `careSyncLogoGradient-${sequenceId}`;

    return (
        <motion.svg
            key={`collapse-seq-${sequenceId}`}
            width={size}
            height={size}
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ width: size, height: size, objectFit: "contain" }}
            initial={{ scale: 0.96, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id={gradientId} x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#16A085" />
                    <stop offset="0.55" stopColor="#2DBBD4" />
                    <stop offset="1" stopColor="#5A8FC9" />
                </linearGradient>
            </defs>

            <motion.circle
                cx="32"
                cy="32"
                r="2.1"
                fill={`url(#${gradientId})`}
                initial={{ scale: 0.15, opacity: 0.95 }}
                animate={{ scale: [0.15, 1.25, 0], opacity: [0.95, 0.85, 0] }}
                transition={{ duration: 0.34, ease: "easeOut", times: [0, 0.45, 1] }}
            />

            <motion.path
                d="M32 8A24 24 0 1 1 32 56A24 24 0 1 1 32 8Z"
                stroke={`url(#${gradientId})`}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.45, ease: "easeOut" }}
            />

            <motion.path
                d="M32 40L26 34C22.4 30.4 22.4 24.6 26 21C29.6 17.4 35.4 17.4 39 21C42.6 24.6 42.6 30.4 39 34L32 40Z"
                stroke={`url(#${gradientId})`}
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.26, duration: 0.4, ease: "easeOut" }}
            />

            <motion.path
                d="M25 29H29L31 25L34 33L36.5 29H40"
                stroke={`url(#${gradientId})`}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.32, ease: "easeOut" }}
            />
        </motion.svg>
    );
}
