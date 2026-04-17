import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const BRAND_LOGO_SRC = "/brand/caresync-logo.svg";
const COLLAPSED_STROKE = "#18BED6";
const COLLAPSED_PATHS = [
    {
        d: "M16 36C20 23 32 15 46 15C61 15 74 24 79 38",
        width: 5.2,
    },
    {
        d: "M80 60C75 74 62 82 47 82C32 82 20 74 15 61",
        width: 5.2,
    },
    {
        d: "M48 63L40 56C35 51 31 47 31 41C31 35.8 35.2 31.8 40.5 31.8C44 31.8 46.8 33.6 48 36.2C49.2 33.6 52 31.8 55.5 31.8C60.8 31.8 65 35.8 65 41C65 47 61 51 56 56L48 63Z",
        width: 4.8,
    },
    {
        d: "M37 46H42.5L46.5 41L50.5 52L54.5 46H60",
        width: 3.3,
    },
];

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

    if (!collapsed) {
        return <StaticLogo size={size} className={className} />;
    }

    if (prefersReducedMotion) {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 96 96"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                style={{ width: size, height: size, objectFit: "contain" }}
                aria-hidden="true"
            >
                {COLLAPSED_PATHS.map((path) => (
                    <path
                        key={path.d}
                        d={path.d}
                        stroke={COLLAPSED_STROKE}
                        strokeWidth={path.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
        );
    }

    return (
        <motion.svg
            key={`collapse-seq-${sequenceId}`}
            width={size}
            height={size}
            viewBox="0 0 96 96"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            style={{ width: size, height: size, objectFit: "contain" }}
            initial={{ scale: 0.96, opacity: 0.94 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            aria-hidden="true"
        >
            <motion.circle
                cx="48"
                cy="48"
                r="2.4"
                fill={COLLAPSED_STROKE}
                initial={{ scale: 0.14, opacity: 0.96 }}
                animate={{ scale: [0.14, 1.2, 0], opacity: [0.96, 0.84, 0] }}
                transition={{ duration: 0.32, ease: "easeOut", times: [0, 0.45, 1] }}
            />

            {COLLAPSED_PATHS.map((path, index) => (
                <motion.path
                    key={`${sequenceId}-${index}`}
                    d={path.d}
                    stroke={COLLAPSED_STROKE}
                    strokeWidth={path.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{
                        delay: 0.08 + index * 0.1,
                        duration: 0.42,
                        ease: "easeOut",
                    }}
                />
            ))}
        </motion.svg>
    );
}
