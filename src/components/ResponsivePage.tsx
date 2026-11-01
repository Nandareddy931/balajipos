import { useEffect, useState, type ReactNode } from "react";

interface ResponsivePageProps {
    desktop: ReactNode;
    mobile: ReactNode;
}

export default function ResponsivePage({
    desktop,
    mobile,
}: ResponsivePageProps) {
    const [isMobile, setIsMobile] = useState(
        () => window.matchMedia("(max-width: 767px)").matches
    );

    useEffect(() => {
        const media = window.matchMedia("(max-width: 767px)");

        const handleChange = (event: MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        setIsMobile(media.matches);
        media.addEventListener("change", handleChange);

        return () => {
            media.removeEventListener("change", handleChange);
        };
    }, []);

    return isMobile ? mobile : desktop;
}