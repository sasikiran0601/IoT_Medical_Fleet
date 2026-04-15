import React, { Suspense, lazy } from "react";
import { Cpu } from "lucide-react";

const IoTLoginShowcase = lazy(() => import("./IoTLoginShowcase"));

class ShowcaseErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        // eslint-disable-next-line no-console
        console.error("IoT showcase failed to render:", error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback;
        }
        return this.props.children;
    }
}

function ShowcaseFallback() {
    return (
        <div className="relative flex h-[640px] w-[640px] items-center justify-center">
            <div className="relative rounded-3xl border border-cyan-100/50 bg-cyan-950/25 p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.08)] backdrop-blur-md">
                <span className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
                    <Cpu size={22} />
                </span>
                <p className="text-base font-semibold text-cyan-50">3D preview unavailable</p>
                <p className="mt-1 text-sm text-cyan-100/80">Auth page is safe. If this stays visible, the 3D scene failed to initialize.</p>
            </div>
        </div>
    );
}

export default function SafeIoTShowcase() {
    return (
        <ShowcaseErrorBoundary fallback={<ShowcaseFallback />}>
            <Suspense fallback={<ShowcaseFallback />}>
                <IoTLoginShowcase />
            </Suspense>
        </ShowcaseErrorBoundary>
    );
}
