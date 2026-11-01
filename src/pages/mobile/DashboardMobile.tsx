
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ShoppingCart,
    FileText,
    Package,
    CreditCard,
    TrendingUp,
    AlertTriangle,
    Plus,
    ScanLine,
    BarChart3,
    ChevronRight,
    CheckCircle2,
    RefreshCw,
    ArrowUpRight,
    CalendarDays,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
    getDashboardData,
    type DashboardData,
} from "../../services/dashboardService";

export default function DashboardMobile() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getDashboardData();
            setDashboard(data);
        } catch (err) {
            console.error("Mobile dashboard loading error:", err);
            setError("Unable to load dashboard. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const formatCurrency = (amount: number) =>
        `₹${Number(amount || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        })}`;

    const formatDate = (value: string) => {
        if (!value) return "—";

        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
        const date = match
            ? new Date(+match[1], +match[2] - 1, +match[3])
            : new Date(value);

        return Number.isNaN(date.getTime())
            ? value
            : date.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
            });
    };

    const today = new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

    const summaryCards = [
        {
            label: "Today's Sales",
            value: formatCurrency(dashboard?.todaySales ?? 0),
            icon: ShoppingCart,
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-700",
            accent: "border-l-emerald-500",
        },
        {
            label: "Today's Bills",
            value: String(dashboard?.todayBills ?? 0),
            icon: FileText,
            iconBg: "bg-blue-100",
            iconColor: "text-blue-700",
            accent: "border-l-blue-500",
        },
        {
            label: "Total Stock",
            value: Number(dashboard?.totalStock ?? 0).toLocaleString("en-IN"),
            icon: Package,
            iconBg: "bg-violet-100",
            iconColor: "text-violet-700",
            accent: "border-l-violet-500",
        },
        {
            label: "Outstanding",
            value: formatCurrency(dashboard?.outstanding ?? 0),
            icon: CreditCard,
            iconBg: "bg-orange-100",
            iconColor: "text-orange-700",
            accent: "border-l-orange-500",
        },
    ];

    const recentStock = dashboard?.recentStockIn ?? [];
    const lowStock = dashboard?.lowStockProducts ?? [];

    const maxSales = useMemo(
        () =>
            Math.max(
                1,
                ...(dashboard?.salesChart.map((item) => item.amount) ?? [])
            ),
        [dashboard]
    );

    return (
        <main className="min-w-0 space-y-5 bg-[#F5F7F8] px-4 py-5 pb-28 text-slate-800">

            {/* HEADER */}
            <section className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                        Business Overview
                    </p>
                    <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900">
                        Dashboard
                    </h1>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <CalendarDays size={14} />
                        {today}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void loadDashboard()}
                    disabled={loading}
                    aria-label="Refresh dashboard"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm disabled:opacity-50"
                >
                    <RefreshCw
                        size={19}
                        className={loading ? "animate-spin" : ""}
                    />
                </button>
            </section>

            {/* ERROR */}
            {error && (
                <section
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    <p>{error}</p>
                    <button
                        type="button"
                        onClick={() => void loadDashboard()}
                        className="mt-2 font-semibold underline"
                    >
                        Try again
                    </button>
                </section>
            )}

            {/* QUICK BILL ACTION */}
            <Link
                to="/billing"
                className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-emerald-700 p-4 text-white shadow-sm"
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                        <ShoppingCart size={25} />
                    </div>
                    <div>
                        <p className="text-base font-bold">Create New Bill</p>
                        <p className="mt-0.5 text-xs text-emerald-100">
                            Start a new customer sale
                        </p>
                    </div>
                </div>
                <ArrowUpRight size={23} />
            </Link>

            {/* BUSINESS METRICS */}
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                        Business Summary
                    </h2>
                    <span className="text-[11px] font-medium text-slate-400">
                        Today
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <article
                                key={card.label}
                                className={`min-w-0 rounded-2xl border border-slate-100 border-l-[3px] ${card.accent} bg-white p-3.5 shadow-sm`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}>
                                        <Icon size={20} />
                                    </span>
                                </div>

                                <p className="mt-3 text-xs font-medium text-slate-500">
                                    {card.label}
                                </p>
                                <p className="mt-1 break-words text-xl font-extrabold tracking-tight text-slate-900">
                                    {loading ? "..." : card.value}
                                </p>
                            </article>
                        );
                    })}
                </div>
            </section>

            {/* SALES CHART */}
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">
                            Sales Overview
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Performance over the last 7 days
                        </p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <TrendingUp size={19} />
                    </span>
                </div>

                <div className="mt-5 flex h-40 items-stretch gap-2 rounded-xl bg-slate-50 px-2 pb-3 pt-3">
                    {loading ? (
                        <p className="m-auto text-sm text-slate-400">
                            Loading sales...
                        </p>
                    ) : dashboard?.salesChart.length ? (
                        dashboard.salesChart.map((item) => {
                            const height =
                                item.amount <= 0
                                    ? 3
                                    : Math.max(5, (item.amount / maxSales) * 100);

                            const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(item.date);
                            const date = match
                                ? new Date(+match[1], +match[2] - 1, +match[3])
                                : new Date(item.date);

                            const day = Number.isNaN(date.getTime())
                                ? ""
                                : date.toLocaleDateString("en-IN", {
                                    weekday: "short",
                                });

                            return (
                                <div
                                    key={item.date}
                                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                                >
                                    <span className="w-full truncate text-center text-[9px] font-medium text-slate-500">
                                        {item.amount > 0
                                            ? formatCurrency(item.amount)
                                            : "—"}
                                    </span>

                                    <div className="flex h-full max-h-24 w-full items-end justify-center">
                                        <div
                                            className="w-full max-w-8 rounded-t-md bg-emerald-600 transition-all"
                                            style={{ height: `${height}%` }}
                                            title={`${item.date}: ${formatCurrency(item.amount)}`}
                                        />
                                    </div>

                                    <span className="text-[10px] font-medium text-slate-500">
                                        {day}
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <p className="m-auto text-center text-xs text-slate-500">
                            No sales data available.
                        </p>
                    )}
                </div>
            </section>

            {/* INVENTORY SECTION */}
            <section>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900">
                        Inventory Overview
                    </h2>
                    <Link
                        to="/products"
                        className="flex items-center text-xs font-semibold text-emerald-700"
                    >
                        All products <ChevronRight size={15} />
                    </Link>
                </div>

                <div className="grid grid-cols-2 items-start gap-3">

                    {/* LOW STOCK */}
                    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-1">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                                <AlertTriangle size={18} />
                            </span>
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                                {loading ? "..." : lowStock.length}
                            </span>
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-900">
                            Low Stock
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            Products to restock
                        </p>

                        <div className="mt-3 space-y-2">
                            {loading ? (
                                <p className="py-3 text-center text-xs text-slate-400">
                                    Checking...
                                </p>
                            ) : lowStock.length ? (
                                lowStock.slice(0, 3).map((product) => (
                                    <div
                                        key={product.id}
                                        className="rounded-xl bg-red-50/70 p-2"
                                    >
                                        <p className="break-words text-xs font-semibold text-slate-800">
                                            {product.name}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between gap-1">
                                            <span className="text-[10px] text-slate-500">
                                                Min: {product.minimumStock}
                                            </span>
                                            <span className="text-xs font-bold text-red-700">
                                                {product.currentStock} left
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-4 text-center">
                                    <CheckCircle2
                                        size={23}
                                        className="mx-auto text-emerald-600"
                                    />
                                    <p className="mt-2 text-xs font-semibold text-emerald-800">
                                        All good!
                                    </p>
                                    <p className="mt-1 text-[10px] text-slate-500">
                                        No low-stock alerts
                                    </p>
                                </div>
                            )}
                        </div>

                        <Link
                            to="/products"
                            className="mt-3 flex min-h-9 items-center justify-center rounded-lg bg-red-50 text-xs font-semibold text-red-700"
                        >
                            View Products
                        </Link>
                    </section>

                    {/* RECENT STOCK IN */}
                    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-1">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                                <Package size={18} />
                            </span>
                            <Link
                                to="/stock-in-history"
                                aria-label="View stock-in history"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400"
                            >
                                <ChevronRight size={18} />
                            </Link>
                        </div>

                        <h3 className="mt-3 text-sm font-bold text-slate-900">
                            Recent Stock In
                        </h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            Latest received
                        </p>

                        <div className="mt-3">
                            {loading ? (
                                <p className="py-3 text-center text-xs text-slate-400">
                                    Loading...
                                </p>
                            ) : recentStock.length ? (
                                recentStock.slice(0, 1).map((record) => {
                                    const firstItem = record.items?.[0];

                                    const totalQuantity = (record.items ?? []).reduce(
                                        (sum, item) =>
                                            sum + Number(item.quantity || 0),
                                        0
                                    );

                                    return (
                                        <article
                                            key={record.id}
                                            className="rounded-xl bg-emerald-50/70 p-2"
                                        >
                                            <p className="break-words text-xs font-semibold text-slate-800">
                                                {firstItem?.product ?? "Multiple Products"}
                                            </p>
                                            <p className="mt-1 break-words text-[10px] text-slate-500">
                                                {record.supplier || "Supplier not recorded"}
                                            </p>
                                            <p className="mt-2 text-sm font-bold text-emerald-800">
                                                Qty {totalQuantity}
                                            </p>
                                            <div className="mt-2 border-t border-emerald-100 pt-2 text-[10px] text-slate-500">
                                                <p>Invoice: {record.invoiceNumber || "—"}</p>
                                                <p className="mt-1">
                                                    {formatDate(record.invoiceDate)}
                                                </p>
                                            </div>
                                        </article>
                                    );
                                })
                            ) : (
                                <p className="py-4 text-center text-xs text-slate-500">
                                    No stock-in records yet.
                                </p>
                            )}
                        </div>

                        <Link
                            to="/stock-in-history"
                            className="mt-3 flex min-h-9 items-center justify-center rounded-lg bg-emerald-50 text-xs font-semibold text-emerald-800"
                        >
                            View History
                        </Link>
                    </section>
                </div>
            </section>

            {/* QUICK ACTIONS */}
            <section>
                <div className="mb-3">
                    <h2 className="text-base font-bold text-slate-900">
                        Quick Actions
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                        Manage your store faster
                    </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    <Link
                        to="/stock-in/add"
                        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <Plus size={23} />
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                            Add Stock
                        </span>
                    </Link>

                    <Link
                        to="/scan-invoice"
                        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                            <ScanLine size={23} />
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                            Scan Invoice
                        </span>
                    </Link>

                    <Link
                        to="/reports"
                        className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
                            <BarChart3 size={23} />
                        </span>
                        <span className="text-xs font-semibold text-slate-800">
                            Reports
                        </span>
                    </Link>
                </div>
            </section>
        </main>
    );
}
