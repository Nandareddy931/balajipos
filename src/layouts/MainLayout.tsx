import { useState } from "react";
import {
    Menu,
    X,
    Sprout,
    House,
    Bell,
    Package,
    ScanLine,
    ShoppingCart,
    CreditCard
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useLocation } from "react-router-dom";
import OfflineBanner from "../components/OfflineBanner";

function MainLayout() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();
    const isDashboard = location.pathname === "/";
    const mobileNav = [
        { label: "Home", path: "/", icon: House },
        { label: "Products", path: "/products", icon: Package },
        { label: "Scan", path: "/scan-invoice", icon: ScanLine },
        { label: "Billing", path: "/billing", icon: ShoppingCart },
        { label: "Payment", path: "/payments", icon: CreditCard },
    ];


    return (
        <div className="flex min-h-screen w-full overflow-x-clip bg-slate-50">
            <OfflineBanner />
            {/* Existing sidebar: retain for tablet and PC */}
            <div className="hidden shrink-0 sm:block">
                <Sidebar
                    mobileOpen={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                />
            </div>

            {/* Mobile drawer uses the existing Sidebar component */}
            {mobileOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Close navigation"
                        className="fixed inset-0 z-40 bg-black/40 sm:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="fixed inset-y-0 left-0 z-50 w-64 sm:hidden">
                        <Sidebar
                            mobileOpen={mobileOpen}
                            onClose={() => setMobileOpen(false)}
                        />
                    </div>
                </>
            )}

            <div className="min-w-0 flex-1 pb-16 sm:pb-0">
                {/* Existing mobile shop header */}
                {isDashboard && (
                    <header className="flex h-[60px] items-center gap-3 bg-[#087443] px-3 text-white sm:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileOpen((open) => !open)}
                            className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
                            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                        >
                            {mobileOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </button>

                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Sprout className="h-6 w-6 shrink-0 text-green-100" />

                            <div className="min-w-0">
                                <p className="truncate text-[14px] font-bold leading-5 text-white">
                                    New Balaji Ruthu Depo
                                </p>

                                <p className="truncate text-[8px] leading-3 text-green-100">
                                    Pesticides | Insecticides | Fungicides | Herbicides
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            aria-label="Notifications"
                            className="flex h-9 w-8 shrink-0 items-center justify-center rounded-md hover:bg-white/10"
                        >
                            <Bell className="h-5 w-5" />
                        </button>
                    </header>)}

                <Outlet />
            </div>


            {/* Mobile-only bottom navigation */}
            <nav
                aria-label="Mobile navigation"
                className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] sm:hidden"
            >
                <div className="grid h-[60px] grid-cols-5 px-1">
                    {mobileNav.map(({ label, path, icon: Icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === "/"}
                            aria-label={label}
                            className={({ isActive }) =>
                                `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] transition-colors ${isActive
                                    ? "font-bold text-emerald-700"
                                    : "font-medium text-slate-500 hover:text-emerald-700"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-emerald-600" />
                                    )}
                                    <Icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 1.9}
                                    />
                                    <span className="max-w-full truncate">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>

        </div>
    );
}

export default MainLayout;

