import { useEffect, useRef, useState } from "react";
import { Cpu } from "lucide-react";

const RADIAL_NODES = [
    { id: "dashboard", title: "Dashboard", image: "/previews/dashboard-preview.svg", x: -230, y: -154 },
    { id: "sensors", title: "Sensors", image: "/previews/sensors-preview.svg", x: 232, y: -148 },
    { id: "alerts", title: "Alerts", image: "/previews/alerts-preview.svg", x: -230, y: 162 },
    { id: "api", title: "API Features", image: "/previews/api-preview.svg", x: 232, y: 164 },
];

const CENTER = { x: 320, y: 320 };
const MODEL_VIEWER_SRC = "https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js";

function readOriginalGlbMaterialFactors(buffer) {
    try {
        const view = new DataView(buffer);
        const magic = String.fromCharCode(
            view.getUint8(0),
            view.getUint8(1),
            view.getUint8(2),
            view.getUint8(3)
        );
        if (magic !== "glTF") {
            return [];
        }

        const jsonChunkLength = view.getUint32(12, true);
        const jsonChunkType = String.fromCharCode(
            view.getUint8(16),
            view.getUint8(17),
            view.getUint8(18),
            view.getUint8(19)
        );
        if (jsonChunkType !== "JSON") {
            return [];
        }

        const decoder = new TextDecoder("utf-8");
        const jsonBytes = new Uint8Array(buffer, 20, jsonChunkLength);
        const gltf = JSON.parse(decoder.decode(jsonBytes).replace(/\u0000+$/g, ""));
        const materials = gltf?.materials || [];

        return materials.map((mat) => {
            const ext = mat?.extensions?.KHR_materials_pbrSpecularGlossiness;
            const diffuse = ext?.diffuseFactor;
            if (Array.isArray(diffuse) && diffuse.length >= 3) {
                return [diffuse[0], diffuse[1], diffuse[2], diffuse[3] ?? 1];
            }
            const base = mat?.pbrMetallicRoughness?.baseColorFactor;
            if (Array.isArray(base) && base.length >= 3) {
                return [base[0], base[1], base[2], base[3] ?? 1];
            }
            return null;
        });
    } catch {
        return [];
    }
}

export default function IoTLoginShowcase() {
    const [viewerReady, setViewerReady] = useState(() => typeof window !== "undefined" && !!window.customElements?.get("model-viewer"));
    const viewerRef = useRef(null);
    const originalFactorsRef = useRef([]);

    useEffect(() => {
        if (typeof window === "undefined" || window.customElements?.get("model-viewer")) {
            setViewerReady(true);
            return;
        }

        const existing = document.querySelector('script[src*="@google/model-viewer"]');
        const onLoad = () => setViewerReady(!!window.customElements?.get("model-viewer"));
        const onError = () => setViewerReady(false);

        if (existing) {
            existing.addEventListener("load", onLoad);
            existing.addEventListener("error", onError);
            return () => {
                existing.removeEventListener("load", onLoad);
                existing.removeEventListener("error", onError);
            };
        }

        const script = document.createElement("script");
        script.type = "module";
        script.src = MODEL_VIEWER_SRC;
        script.addEventListener("load", onLoad);
        script.addEventListener("error", onError);
        document.head.appendChild(script);

        return () => {
            script.removeEventListener("load", onLoad);
            script.removeEventListener("error", onError);
        };
    }, []);

    useEffect(() => {
        if (!viewerReady) {
            return;
        }

        let canceled = false;
        const viewer = viewerRef.current;
        if (!viewer) {
            return;
        }

        const applyOriginalColors = () => {
            const model = viewer.model;
            const factors = originalFactorsRef.current;
            if (!model?.materials?.length || !factors?.length) {
                return;
            }

            model.materials.forEach((material, index) => {
                const factor = factors[index];
                if (!factor) {
                    return;
                }
                if (material?.pbrMetallicRoughness?.setBaseColorFactor) {
                    material.pbrMetallicRoughness.setBaseColorFactor(factor);
                }
                if (material?.setDoubleSided) {
                    material.setDoubleSided(true);
                }
            });
        };

        const onLoad = () => applyOriginalColors();
        viewer.addEventListener("load", onLoad);

        (async () => {
            if (!originalFactorsRef.current.length) {
                const response = await fetch("/models/esp32_wroom.glb");
                const buffer = await response.arrayBuffer();
                if (!canceled) {
                    originalFactorsRef.current = readOriginalGlbMaterialFactors(buffer);
                }
            }
            if (!canceled) {
                applyOriginalColors();
            }
        })().catch(() => {});

        return () => {
            canceled = true;
            viewer.removeEventListener("load", onLoad);
        };
    }, [viewerReady]);

    return (
        <div className="relative h-[640px] w-[640px]">
            <svg className="pointer-events-none absolute inset-0" width="640" height="640" viewBox="0 0 640 640" fill="none">
                {RADIAL_NODES.map((node, index) => (
                    <line
                        key={node.id}
                        className="neon-flow-line"
                        x1={CENTER.x}
                        y1={CENTER.y}
                        x2={CENTER.x + node.x}
                        y2={CENTER.y + node.y}
                        stroke="rgba(226, 232, 240, 1)"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeDasharray="11 9"
                        opacity="1"
                        style={{
                            filter: "drop-shadow(0 0 14px rgba(226, 232, 240, 0.92))",
                            animationDelay: `${index * 0.12}s`,
                        }}
                    >
                        <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
                    </line>
                ))}
            </svg>

            {RADIAL_NODES.map((node) => (
                <div
                    key={node.id}
                    className="absolute w-[212px]"
                    style={{
                        left: CENTER.x,
                        top: CENTER.y,
                        transform: `translate(-50%, -50%) translate(${node.x}px, ${node.y}px)`,
                    }}
                >
                    <div className="overflow-hidden rounded-2xl border border-cyan-100/70 bg-transparent shadow-[0_16px_34px_rgba(14,116,144,0.24)]">
                        <img src={node.image} alt={`${node.title} preview`} className="h-[126px] w-full object-cover" />
                        <div className="bg-cyan-950/45 px-3 py-2 text-[11px] font-semibold tracking-wide text-cyan-50 backdrop-blur-sm">
                            {node.title}
                        </div>
                    </div>
                </div>
            ))}

            <div className="absolute" style={{ left: CENTER.x, top: CENTER.y, transform: "translate(-50%, -50%)" }}>
                <div
                    className="relative rounded-full"
                    style={{
                        width: "clamp(220px, 30vw, 300px)",
                        height: "clamp(220px, 30vw, 300px)",
                    }}
                >
                    <span className="pointer-events-none absolute inset-8 rounded-full bg-cyan-300/25 blur-[48px]" />
                    <div className="relative h-full w-full" style={{ filter: "drop-shadow(0 20px 42px rgba(12,74,110,0.34))" }}>
                        {viewerReady ? (
                            <model-viewer
                                ref={viewerRef}
                                src="/models/esp32_wroom.glb"
                                camera-controls
                                disable-pan
                                disable-zoom
                                touch-action="none"
                                orientation="0deg 0deg 90deg"
                                auto-rotate
                                auto-rotate-delay="0"
                                rotation-per-second="8deg"
                                camera-orbit="0deg 78deg 145%"
                                camera-target="auto auto auto"
                                min-camera-orbit="auto 0deg 145%"
                                max-camera-orbit="auto 180deg 145%"
                                field-of-view="26deg"
                                min-field-of-view="26deg"
                                max-field-of-view="26deg"
                                environment-image="neutral"
                                exposure="1.02"
                                interaction-prompt="none"
                                interaction-prompt-threshold="0"
                                loading="eager"
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    background: "transparent",
                                    cursor: "grab",
                                    "--progress-bar-height": "0px",
                                    "--poster-color": "transparent",
                                }}
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-cyan-800">
                                    <Cpu size={13} />
                                    Loading ESP32...
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
