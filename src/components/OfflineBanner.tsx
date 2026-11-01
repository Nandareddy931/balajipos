import { useEffect, useState } from "react";

export default function OfflineBanner() {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [justCameBack, setJustCameBack] = useState(false);

    useEffect(() => {
        let timeoutId: number | undefined;

        const handleOnline = () => {
            setOnline(true);
            setJustCameBack(true);

            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }

            timeoutId = window.setTimeout(() => {
                setJustCameBack(false);
            }, 3000);
        };

        const handleOffline = () => {
            setOnline(false);
            setJustCameBack(false);

            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);

            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    if (online && !justCameBack) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`fixed left-1/2 top-3 z-[100] w-max max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg border px-4 py-2 text-center text-xs font-medium shadow-lg ${online
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
        >
            {online
                ? "✓ Back online — syncing changes..."
                : "⚠ You're offline — changes will sync when online"}
        </div>
    );
}