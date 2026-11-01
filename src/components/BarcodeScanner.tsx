
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
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

    const [error, setError] = useState("");
    const [starting, setStarting] = useState(true);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [lastScanned, setLastScanned] = useState("");

    // Always use the latest billing callback without restarting the camera.
    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    useEffect(() => {
        const reader = new BrowserMultiFormatReader();

        let controls: { stop: () => void } | undefined;
        let active = true;

        const startScanner = async () => {
            try {
                setStarting(true);
                setError("");

                // Request camera permission.
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" },
                    },
                });

                stream.getTracks().forEach((track) => track.stop());

                if (!active) return;

                const cameras =
                    await BrowserMultiFormatReader.listVideoInputDevices();

                if (!active) return;

                if (cameras.length === 0) {
                    throw new Error("No camera found.");
                }

                setDevices(cameras);

                // Prefer a physical rear camera.
                const preferredCamera =
                    cameras.find((device) =>
                        /back|rear|environment/i.test(device.label)
                    ) ||
                    cameras.find((device) =>
                        !/obs|virtual|droidcam|manycam/i.test(device.label)
                    ) ||
                    cameras[0];

                // Select the default camera on first opening.
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

                if (!videoRef.current) return;

                // Continuous scanning: the camera stays active after a scan.
                controls = await reader.decodeFromVideoDevice(
                    selectedDevice,
                    videoRef.current,
                    (result) => {
                        if (!active) return;

                        if (result) {
                            const barcode = result.getText().trim();
                            const now = Date.now();

                            // Ignore repeated detections of the same
                            // barcode while it remains in view.
                            if (
                                barcode === lastBarcodeRef.current &&
                                now - lastSeenAtRef.current < 1200
                            ) {
                                lastSeenAtRef.current = now;
                                return;
                            }

                            // A different barcode or a barcode
                            // seen again after leaving the frame.
                            lastBarcodeRef.current = barcode;
                            lastSeenAtRef.current = now;

                            setLastScanned(barcode);
                            onScanRef.current(barcode);
                        } else if (
                            lastBarcodeRef.current &&
                            Date.now() - lastSeenAtRef.current > 1200
                        ) {
                            // Allow the same product to be scanned
                            // again after it leaves the camera view.
                            lastBarcodeRef.current = "";
                        }
                    }
                );
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
            />

            {/* Larger scanning guide - visual only */}
            <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-16 -translate-y-1/2 rounded-lg border-2 border-emerald-400/80">
                <span className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-emerald-400" />
            </div>

            {/* Camera loading */}
            {starting && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/75">
                    <Camera size={25} />
                    <p className="text-xs">Starting camera...</p>
                </div>
            )}

            {/* Last scanned product barcode */}
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
