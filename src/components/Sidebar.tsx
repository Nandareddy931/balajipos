
import {
    LayoutDashboard,
    Package,
    Sprout,
    ShoppingCart,
    FileText,
    Users,
    CreditCard,
    BarChart3,
    Settings,
} from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { logoutUser } from "../services/authService";
import { useAuth } from "./AuthProvider";

interface SidebarProps {
    mobileOpen?: boolean;
    onClose?: () => void;
}

const navigation = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Stock In", path: "/stock-in", icon: Package },
    { name: "Products", path: "/products", icon: Sprout },
    { name: "Sales", path: "/sales", icon: ShoppingCart },
    { name: "Billing", path: "/billing", icon: FileText },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "Payments", path: "/payments", icon: CreditCard },
    { name: "Reports", path: "/reports", icon: BarChart3 },
];

function Sidebar({
    mobileOpen = false,
    onClose,
}: SidebarProps) {
    // Hooks must be called inside the component.
    const { shopUser } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logoutUser();
            onClose?.();
            navigate("/login", { replace: true });
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <aside
            className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col
        border-r border-green-100 bg-white
        transition-transform duration-300
        lg:static lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}
        >
            {/* Logo / Shop Name */}
            <div className="border-b border-green-100 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-600 text-white">
                        <Sprout className="h-6 w-6" />
                    </div>

                    <div>
                        <h1 className="text-sm font-bold text-green-700">
                            NEW BALAJI
                        </h1>
                        <p className="text-sm font-semibold text-slate-700">
                            RUTHU DEPO
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-5">
                <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Main Menu
                </p>

                <div className="space-y-1">
                    {navigation.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === "/"}
                                onClick={onClose}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive
                                        ? "bg-green-600 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-green-50 hover:text-green-700"
                                    }`
                                }
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.name}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            {/* Settings */}
            <div className="border-t border-green-100 p-3">
                <NavLink
                    to="/settings"
                    onClick={onClose}
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${isActive
                            ? "bg-green-600 text-white"
                            : "text-slate-600 hover:bg-green-50 hover:text-green-700"
                        }`
                    }
                >
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                </NavLink>
            </div>

            {/* Shop User and Logout */}
            <div className="mt-auto border-t border-neutral-200 p-4">
                <p className="mb-2 text-xs text-neutral-500">
                    {shopUser?.displayName ?? "Shop"}
                </p>

                <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                    Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
