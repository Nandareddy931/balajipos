
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import {
    BarcodeFormat,
    DecodeHintType,
} from "@zxing/library";
import {
    X,
    Camera,
    ScanBarcode,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";

interface BarcodeScannerProps {
    onScan: (barcode: string) => void;
    onClose: () => void;
}

function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const onScanRef = useRef(onScan);

    const lastBarcodeRef = useRef("");
    const lastSeenAtRef = useRef(0);
    const scanLockedRef = useRef(false);

    const [error, setError] = useState("");
    const [starting, setStarting] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [lastScanned, setLastScanned] = useState("");

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        let active = true;
        let controls: { stop: () => void } | undefined;

        const hints = new Map();

        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
            BarcodeFormat.UPC_A,
            BarcodeFormat.UPC_E,
        ]);

        const reader = new BrowserMultiFormatReader(hints);

        const startScanner = async () => {
            try {
                setStarting(true);
                setError("");

                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error(
                        "Camera access is unavailable. Open this app using HTTPS."
                    );
                }

                // Request permission so camera labels become available.
                const permissionStream =
                    await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: {
                            facingMode: { ideal: "environment" },
                        },
                    });

                permissionStream.getTracks().forEach((track) => track.stop());

                if (!active) return;

                const cameras =
                    await BrowserMultiFormatReader.listVideoInputDevices();

                if (!active) return;

                if (cameras.length === 0) {
                    throw new Error("No camera found on this device.");
                }

                setDevices(cameras);

                // Prefer the rear camera.
                const preferredCamera =
                    cameras.find((device) =>
                        /back|rear|environment|world/i.test(device.label)
                    ) ||
                    cameras.find((device) =>
                        !/obs|virtual|droidcam|manycam/i.test(device.label)
                    ) ||
                    cameras[0];

                // Select the preferred camera on the first opening.
                if (!selectedDevice) {
                    setSelectedDevice(preferredCamera.deviceId);
                    return;
                }

                const cameraExists = cameras.some(
                    (device) => device.deviceId === selectedDevice
                );

                if (!cameraExists) {
                    setSelectedDevice(preferredCamera.deviceId);
                    return;
                }

                const video = videoRef.current;

                if (!video) return;

                // Request a higher-resolution camera stream for clearer
                // barcode images, especially with small product packaging.
                const newControls = await reader.decodeFromConstraints(
                    {
                        audio: false,
                        video: {
                            deviceId: { exact: selectedDevice },
                            facingMode: { ideal: "environment" },
                            width: { ideal: 1280 },
                            height: { ideal: 720 },
                            frameRate: { ideal: 30 },
                        },
                    },
                    video,
                    (result) => {
                        if (!active || !result || scanLockedRef.current) {
                            return;
                        }

                        const barcode = result.getText().trim();

                        if (!barcode) return;

                        const now = Date.now();

                        // Prevent the same barcode from being processed
                        // repeatedly while it remains in front of the camera.
                        if (
                            barcode === lastBarcodeRef.current &&
                            now - lastSeenAtRef.current < 1500
                        ) {
                            lastSeenAtRef.current = now;
                            return;
                        }

                        lastBarcodeRef.current = barcode;
                        lastSeenAtRef.current = now;

                        // Lock briefly while the product is processed.
                        scanLockedRef.current = true;

                        setLastScanned(barcode);
                        onScanRef.current(barcode);

                        window.setTimeout(() => {
                            if (active) {
                                scanLockedRef.current = false;
                            }
                        }, 700);
                    }
                );

                // The component may have unmounted while the camera
                // was starting. Stop the newly created camera immediately.
                if (!active) {
                    newControls.stop();
                    return;
                }

                controls = newControls;

                // Ensure the video element starts playing.
                await video.play().catch(() => {
                    // ZXing normally starts playback itself.
                });

                if (!active) {
                    controls?.stop();
                    return;
                }

                // Enable continuous autofocus when the browser supports it.
                const stream = video.srcObject as MediaStream | null;
                const track = stream?.getVideoTracks()[0];

                if (track) {
                    const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
                        focusMode?: string[];
                    };

                    if (capabilities.focusMode?.includes("continuous")) {
                        await track.applyConstraints({
                            advanced: [
                                {
                                    focusMode: "continuous",
                                } as MediaTrackConstraintSet,
                            ],
                        }).catch(() => {
                            // Autofocus is optional; not all cameras support it.
                        });
                    }
                }
            } catch (err) {
                if (active) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Unable to start camera."
                    );
                }
            } finally {
                if (active) setStarting(false);
            }
        };

        void startScanner();

        return () => {
            active = false;
            controls?.stop();

            const video = videoRef.current;

            if (video?.srcObject instanceof MediaStream) {
                video.srcObject.getTracks().forEach((track) => track.stop());
                video.srcObject = null;
            }
        };
    }, [selectedDevice]);

    return (
        <section className="relative h-[25vh] min-h-[150px] max-h-[200px] overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-white shadow-md">

            {/* Header */}
            <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between bg-black/60 px-3 py-2">
                <div>
                    <h2 className="text-sm font-bold">
                        Continuous Barcode Scanner
                    </h2>
                    <p className="text-[10px] text-slate-300">
                        Point camera at any product barcode
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg bg-white/15 p-2"
                    aria-label="Close scanner"
                >
                    <X size={19} />
                </button>
            </header>

            {/* Camera */}
            <video
                ref={videoRef}
                className="h-full w-full bg-black object-cover"
                muted
                playsInline
                autoPlay
            />

            {/* Wide, forgiving scanning guide */}
            <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 h-28 -translate-y-1/2 rounded-2xl border-2 border-emerald-400/80">
                <div className="absolute inset-0 rounded-2xl bg-emerald-400/5" />

                <span className="absolute -left-0.5 -top-0.5 h-5 w-5 rounded-tl-xl border-l-4 border-t-4 border-emerald-400" />
                <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-tr-xl border-r-4 border-t-4 border-emerald-400" />
                <span className="absolute -bottom-0.5 -left-0.5 h-5 w-5 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-br-xl border-b-4 border-r-4 border-emerald-400" />
            </div>

            <div className="pointer-events-none absolute bottom-11 left-0 right-0 z-10 text-center text-xs font-medium text-white drop-shadow">
                Place barcode anywhere in camera view
            </div>

            {/* Camera loading */}
            {starting && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/75">
                    <Camera size={25} />
                    <p className="text-xs">Starting camera...</p>
                </div>
            )}

            {/* Last scanned barcode */}
            {!starting && lastScanned && !error && (
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2 rounded-lg bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white">
                    <CheckCircle2 size={15} />
                    Product scanned
                </div>
            )}

            {/* Camera selector */}
            {devices.length > 1 && !starting && (
                <select
                    value={selectedDevice}
                    onChange={(event) => setSelectedDevice(event.target.value)}
                    className="absolute bottom-2 right-2 z-20 max-w-[55%] rounded-lg bg-slate-900 p-2 text-xs text-white"
                >
                    {devices.map((device, index) => (
                        <option
                            key={device.deviceId}
                            value={device.deviceId}
                        >
                            {device.label || `Camera ${index + 1}`}
                        </option>
                    ))}
                </select>
            )}

            {/* Errors */}
            {error && (
                <div className="absolute bottom-2 left-2 right-2 z-30 flex items-center gap-2 rounded-lg bg-red-950/95 p-2 text-xs text-red-200">
                    <AlertCircle size={17} />
                    <span>{error}</span>
                </div>
            )}

            {!starting && !error && (
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 text-[10px] text-white">
                    <ScanBarcode size={15} />
                    Continuous scanning active
                </div>
            )}
        </section>
    );
}

export default BarcodeScanner;
