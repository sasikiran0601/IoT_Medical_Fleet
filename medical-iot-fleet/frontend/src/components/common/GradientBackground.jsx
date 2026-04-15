import { motion } from 'framer-motion';

const Default_Gradients = [
    "linear-gradient(90deg, #A5F3FC 0%, #67E8F9 30%, #7DD3FC 65%, #BFDBFE 100%)",
    "linear-gradient(90deg, #99F6E4 0%, #5EEAD4 30%, #7DD3FC 65%, #93C5FD 100%)",
    "linear-gradient(90deg, #A7F3D0 0%, #5EEAD4 35%, #60A5FA 70%, #BFDBFE 100%)",
    "linear-gradient(90deg, #CFFAFE 0%, #67E8F9 30%, #93C5FD 70%, #DBEAFE 100%)",
    "linear-gradient(90deg, #A5F3FC 0%, #67E8F9 30%, #7DD3FC 65%, #BFDBFE 100%)",
];

export function GradientBackground({
    children,
    className = '',
    gradients = Default_Gradients,
    animationDuration = 8,
    animationDelay = 0.5,
    overlay = false,
    overlayOpacity = 0.3,
}) {
    return (
        <div className={`w-full relative min-h-screen overflow-hidden ${className}`}>
            {/* Animated gradient background */}
            <motion.div
                className="absolute inset-0"
                style={{ background: gradients[0] }}
                animate={{ background: gradients }}
                transition={{
                    delay: animationDelay,
                    duration: animationDuration,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: 'easeInOut',
                }}
            />

            {/* Optional overlay */}
            {overlay && (
                <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: overlayOpacity }}
                />
            )}

            {/* Content wrapper */}
            {children && (
                <div className="relative z-10 w-full min-h-screen">
                    {children}
                </div>
            )}
        </div>
    );
}
