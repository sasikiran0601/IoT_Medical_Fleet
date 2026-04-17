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

    return (
        <motion.img
            key={`collapse-seq-${sequenceId}`}
            src={BRAND_LOGO_SRC}
            alt="CareSync logo"
            width={size}
            height={size}
            className={className}
            style={{ width: size, height: size, objectFit: "contain" }}
            initial={{ scale: 0.25, opacity: 0.25, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.38, ease: "easeOut" }}
        />
    );
}
