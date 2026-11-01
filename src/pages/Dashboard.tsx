
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Bell,
    CalendarDays,
    RefreshCw,
    ShoppingCart,
    Package,
    Wallet,
    Users,
    ScanLine,
    ArrowDownToLine,
    ArrowUpFromLine,
    Plus,
    FileBarChart,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Receipt,
    Boxes,
    Clock,
    Barcode,
    IndianRupee,
    Activity,
} from "lucide-react";

import { Link } from "react-router-dom";

import {
    getDashboardData,
    type DashboardData,
} from "../services/dashboardService";

function Dashboard() {
    const [dashboard, setDashboard] =
        useState<DashboardData | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [chartPeriod, setChartPeriod] = useState("7 days");

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const result = await getDashboardData();
            setDashboard(result);
        } catch (err) {
            console.error("Dashboard error:", err);
            setError(
                "Unable to load dashboard data. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const data = dashboard;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(value || 0);

    const formatDate = (value: string) => {
        if (!value) return "—";

        const date = new Date(`${value}T12:00:00`);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
        });
    };

    const filteredSales = useMemo(() => {
        const sales = data?.salesChart ?? [];

        if (chartPeriod === "7 days") return sales.slice(-7);

        const days = chartPeriod === "30 days" ? 30 : 7;
        const cutoff = new Date();
        cutoff.setHours(12, 0, 0, 0);
        cutoff.setDate(cutoff.getDate() - days + 1);

        const cutoffString = [
            cutoff.getFullYear(),
            String(cutoff.getMonth() + 1).padStart(2, "0"),
            String(cutoff.getDate()).padStart(2, "0"),
        ].join("-");

        return sales.filter((item) => item.date >= cutoffString);
    }, [data?.salesChart, chartPeriod]);

    const maxSales = Math.max(
        1,
        ...filteredSales.map((item) => item.amount)
    );

    const filteredRecentSales = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return data?.recentSales ?? [];

        return (data?.recentSales ?? []).filter(
            (sale) =>
                sale.customerName.toLowerCase().includes(term) ||
                sale.billNumber.toLowerCase().includes(term)
        );
    }, [data?.recentSales, search]);

    const summaryCards = [
        {
            title: "Today's Sales",
            value: formatCurrency(data?.todaySales ?? 0),
            subtitle: `${data?.todayBills ?? 0} bills generated today`,
            icon: TrendingUp,
            color: "emerald",
        },
        {
            title: "Total Products",
            value: String(data?.totalProducts ?? 0),
            subtitle: "Active inventory products",
            icon: Package,
            color: "blue",
        },
        {
            title: "Stock Value",
            value: formatCurrency(data?.stockValue ?? 0),
            subtitle: "Based on purchase rate",
            icon: Wallet,
            color: "violet",
        },
        {
            title: "Total Customers",
            value: String(data?.totalCustomers ?? 0),
            subtitle: "Unique customers from bills",
            icon: Users,
            color: "orange",
        },
    ];

    const quickActions = [
        {
            title: "New Sale",
            description: "Create customer bill",
            icon: ShoppingCart,
            path: "/billing",
            color: "bg-emerald-600 text-white",
        },
        {
            title: "Scan Barcode",
            description: "Scan product invoice",
            icon: ScanLine,
            path: "/scan-invoice",
            color: "bg-blue-50 text-blue-700",
        },
        {
            title: "Stock In",
            description: "Add incoming inventory",
            icon: ArrowDownToLine,
            path: "/stock-in",
            color: "bg-violet-50 text-violet-700",
        },
        {
            title: "Stock Out",
            description: "Manage inventory",
            icon: ArrowUpFromLine,
            path: "/products",
            color: "bg-orange-50 text-orange-700",
        },
        {
            title: "Add Product",
            description: "Register new product",
            icon: Plus,
            path: "/products",
            color: "bg-pink-50 text-pink-700",
        },
        {
            title: "Reports",
            description: "View sales records",
            icon: FileBarChart,
            path: "/sales",
            color: "bg-indigo-50 text-indigo-700",
        },
    ];

    const alertCount =
        (data?.lowStockProducts.length ?? 0) +
        (data?.outOfStockProducts.length ?? 0) +
        (data?.expiryAlerts.length ?? 0);

    return (
        <div className="min-h-screen bg-[#f1f8f4] text-slate-800">

            {/* TOP NAVIGATION */}

            <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 backdrop-blur">
                <div className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 xl:px-8">

                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                            <Boxes size={23} />
                        </div>

                        <div>
                            <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
                                Balaji Stock
                            </h2>
                            <p className="text-[10px] font-semibold uppercase tracking-[2px] text-emerald-600">
                                Retail management
                            </p>
                        </div>
                    </div>

                    <div className="relative hidden w-full max-w-md md:block">
                        <Search
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search recent bills or customers..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <p className="text-xs font-semibold text-slate-700">
                                {new Date().toLocaleDateString("en-IN", {
                                    weekday: "short",
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Business dashboard
                            </p>
                        </div>

                        <button
                            onClick={() => void loadDashboard()}
                            disabled={loading}
                            title="Refresh dashboard"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                        >
                            <RefreshCw
                                size={17}
                                className={loading ? "animate-spin" : ""}
                            />
                        </button>

                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500">
                            <Bell size={19} />
                            {alertCount > 0 && (
                                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                                    {alertCount > 99 ? "99+" : alertCount}
                                </span>
                            )}
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-sm font-extrabold text-emerald-700">
                            B
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-3 md:hidden">
                    <div className="relative">
                        <Search
                            size={17}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search bills or customers..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-400"
                        />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[1800px] space-y-6 p-4 sm:p-6 xl:p-7">

                {/* ERROR */}

                {error && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <span className="flex items-center gap-2">
                            <AlertTriangle size={18} />
                            {error}
                        </span>
                        <button
                            onClick={() => void loadDashboard()}
                            className="font-bold underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* WELCOME BANNER */}

                <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#075b3b] via-[#08794d] to-[#16a36a] p-6 text-white shadow-sm sm:p-8">
                    <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
                        <div className="max-w-2xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50">
                                <Activity size={14} />
                                BUSINESS OVERVIEW
                            </div>

                            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                                Welcome to Balaji Stock!
                            </h1>

                            <p className="mt-3 max-w-lg text-sm leading-6 text-emerald-50">
                                Manage your sales, track inventory and
                                monitor your business performance from
                                one place.
                            </p>

                            <Link
                                to="/billing"
                                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
                            >
                                <ShoppingCart size={17} />
                                Create New Sale
                                <ChevronRight size={16} />
                            </Link>
                        </div>

                        <div className="relative hidden h-36 w-44 items-center justify-center md:flex">
                            <div className="absolute h-32 w-32 rounded-full border border-white/20 bg-white/10" />
                            <div className="absolute h-24 w-24 rounded-full border border-white/20 bg-white/10" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/15 shadow-lg">
                                <ShoppingCart size={45} />
                            </div>
                            <div className="absolute right-0 top-2 rounded-xl bg-white p-3 text-emerald-700 shadow-lg">
                                <Package size={23} />
                            </div>
                            <div className="absolute bottom-0 left-1 rounded-xl bg-white p-3 text-emerald-700 shadow-lg">
                                <Receipt size={22} />
                            </div>
                        </div>
                    </div>

                    <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border-[40px] border-white/5" />
                    <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full border-[35px] border-white/5" />
                </section>

                {/* SUMMARY CARDS */}

                <section>
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900">
                                Business Summary
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Key business performance indicators
                            </p>
                        </div>
                        <span className="hidden items-center gap-1 text-xs font-medium text-emerald-700 sm:flex">
                            <CheckCircle2 size={14} />
                            Firestore data
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                        {summaryCards.map((card) => {
                            const Icon = card.icon;

                            const iconColors: Record<string, string> = {
                                emerald: "bg-emerald-50 text-emerald-700",
                                blue: "bg-blue-50 text-blue-700",
                                violet: "bg-violet-50 text-violet-700",
                                orange: "bg-orange-50 text-orange-700",
                            };

                            return (
                                <div
                                    key={card.title}
                                    className="rounded-2xl border border-emerald-100/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-500">
                                                {card.title}
                                            </p>
                                            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
                                                {loading
                                                    ? "—"
                                                    : card.value}
                                            </h3>
                                        </div>
                                        <div className={`rounded-xl p-3 ${iconColors[card.color]}`}>
                                            <Icon size={22} />
                                        </div>
                                    </div>

                                    <p className="mt-3 text-xs text-slate-400">
                                        {card.subtitle}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* QUICK ACTIONS */}

                <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                    <div className="mb-5">
                        <h2 className="text-lg font-extrabold text-slate-900">
                            Quick Actions
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            Frequently used business operations
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                        {quickActions.map((action) => {
                            const Icon = action.icon;

                            return (
                                <Link
                                    key={action.title}
                                    to={action.path}
                                    className="group rounded-xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                                >
                                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${action.color}`}>
                                        <Icon size={21} />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">
                                        {action.title}
                                    </p>
                                    <p className="mt-1 text-[11px] leading-4 text-slate-400">
                                        {action.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </section>

                {/* MAIN DASHBOARD GRID */}

                <section className="grid grid-cols-1 gap-6 2xl:grid-cols-3">

                    {/* LEFT CONTENT */}

                    <div className="min-w-0 space-y-6 2xl:col-span-2">

                        {/* SALES OVERVIEW */}

                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-6">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Sales Overview
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Daily sales performance
                                    </p>
                                </div>

                                <select
                                    value={chartPeriod}
                                    onChange={(e) =>
                                        setChartPeriod(e.target.value)
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-400"
                                >
                                    <option value="7 days">
                                        Last 7 days
                                    </option>
                                    <option value="30 days">
                                        Last 30 days
                                    </option>
                                </select>
                            </div>

                            <div className="mt-7">
                                {loading ? (
                                    <div className="flex h-56 items-end gap-3">
                                        {[35, 65, 45, 80, 55, 90, 60].map(
                                            (height, index) => (
                                                <div
                                                    key={index}
                                                    className="flex-1 animate-pulse rounded-t-lg bg-emerald-50"
                                                    style={{
                                                        height: `${height}%`,
                                                    }}
                                                />
                                            )
                                        )}
                                    </div>
                                ) : filteredSales.length > 0 ? (
                                    <div className="flex h-56 items-end gap-2 sm:gap-4">
                                        {filteredSales.map((item) => {
                                            const height =
                                                item.amount > 0
                                                    ? Math.max(
                                                        3,
                                                        (item.amount / maxSales) * 100
                                                    )
                                                    : 2;

                                            return (
                                                <div
                                                    key={item.date}
                                                    className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                                                >
                                                    <div className="mb-2 hidden rounded-lg bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                                                        {formatCurrency(item.amount)}
                                                    </div>

                                                    <div
                                                        className="w-full max-w-14 rounded-t-lg bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-300 group-hover:from-emerald-700 group-hover:to-emerald-500"
                                                        style={{
                                                            height: `${height}%`,
                                                        }}
                                                        title={formatCurrency(item.amount)}
                                                    />

                                                    <span className="mt-3 text-[10px] text-slate-400 sm:text-xs">
                                                        {formatDate(item.date)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex h-56 flex-col items-center justify-center rounded-xl bg-slate-50">
                                        <TrendingUp
                                            size={34}
                                            className="text-slate-300"
                                        />
                                        <p className="mt-3 text-sm font-semibold text-slate-600">
                                            No sales data available
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Sales will appear when bills are generated.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                <div>
                                    <p className="text-xs text-slate-400">
                                        Total sales today
                                    </p>
                                    <p className="mt-1 text-xl font-extrabold text-slate-900">
                                        {loading
                                            ? "—"
                                            : formatCurrency(data?.todaySales ?? 0)}
                                    </p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                                    {data?.todayBills ?? 0} bills today
                                </div>
                            </div>
                        </div>

                        {/* CATEGORY AND TOP PRODUCTS */}

                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                            {/* SALES BY CATEGORY */}

                            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Sales by Category
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Actual bill item category totals
                                </p>

                                {loading ? (
                                    <div className="flex h-56 animate-pulse items-center justify-center">
                                        <div className="h-36 w-36 rounded-full bg-slate-100" />
                                    </div>
                                ) : data?.categorySales.length ? (
                                    <>
                                        <div className="my-6 flex justify-center">
                                            <div
                                                className="relative flex h-44 w-44 items-center justify-center rounded-full"
                                                style={{
                                                    background: `conic-gradient(${data.categorySales.map((category, index) => {
                                                        const colors = [
                                                            "#059669",
                                                            "#3b82f6",
                                                            "#8b5cf6",
                                                            "#f59e0b",
                                                            "#ec4899",
                                                            "#06b6d4",
                                                            "#64748b",
                                                        ];
                                                        const start = data.categorySales
                                                            .slice(0, index)
                                                            .reduce((sum, item) => sum + item.percentage, 0);
                                                        return `${colors[index % colors.length]} ${start}% ${start + category.percentage}%`;
                                                    }).join(", ")})`,
                                                }}
                                            >
                                                <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white">
                                                    <span className="text-[10px] text-slate-400">
                                                        Category sales
                                                    </span>
                                                    <span className="mt-1 text-lg font-extrabold text-slate-900">
                                                        {formatCurrency(
                                                            data.categorySales.reduce(
                                                                (sum, item) => sum + item.amount,
                                                                0
                                                            )
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            {data.categorySales.map(
                                                (category, index) => {
                                                    const colors = [
                                                        "bg-emerald-500",
                                                        "bg-blue-500",
                                                        "bg-violet-500",
                                                        "bg-amber-500",
                                                        "bg-pink-500",
                                                        "bg-cyan-500",
                                                        "bg-slate-500",
                                                    ];

                                                    return (
                                                        <div
                                                            key={category.name}
                                                            className="flex items-center justify-between gap-2"
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2">
                                                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors[index % colors.length]}`} />
                                                                <span className="truncate text-xs font-medium text-slate-600">
                                                                    {category.name}
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-xs font-bold text-slate-800">
                                                                {category.percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex h-64 flex-col items-center justify-center text-center">
                                        <Boxes size={32} className="text-slate-300" />
                                        <p className="mt-3 text-sm font-semibold text-slate-600">
                                            No category data available
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Bill items need category information.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* TOP SELLING PRODUCTS */}

                            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-extrabold text-slate-900">
                                    Top Selling Products
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Ranked by quantities sold
                                </p>

                                <div className="mt-5 space-y-4">
                                    {loading ? (
                                        <p className="py-10 text-center text-sm text-slate-400">
                                            Loading products...
                                        </p>
                                    ) : data?.topSellingProducts.length ? (
                                        data.topSellingProducts.map(
                                            (product, index) => (
                                                <div
                                                    key={product.id}
                                                    className="flex items-center gap-3"
                                                >
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-extrabold text-emerald-700">
                                                        {index + 1}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-bold text-slate-800">
                                                            {product.name}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            {product.quantity} units sold
                                                        </p>
                                                    </div>

                                                    <p className="shrink-0 text-xs font-bold text-slate-800">
                                                        {formatCurrency(product.amount)}
                                                    </p>
                                                </div>
                                            )
                                        )
                                    ) : (
                                        <div className="py-12 text-center">
                                            <Package
                                                size={32}
                                                className="mx-auto text-slate-300"
                                            />
                                            <p className="mt-3 text-sm font-semibold text-slate-600">
                                                No product sales yet
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RECENT SALES */}

                        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:p-6">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Recent Sales
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Latest billing transactions
                                    </p>
                                </div>

                                <Link
                                    to="/sales"
                                    className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                                >
                                    View all
                                    <ChevronRight size={15} />
                                </Link>
                            </div>

                            {loading ? (
                                <div className="space-y-3 p-5">
                                    {[1, 2, 3].map((item) => (
                                        <div
                                            key={item}
                                            className="h-10 animate-pulse rounded-lg bg-slate-100"
                                        />
                                    ))}
                                </div>
                            ) : filteredRecentSales.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[650px] text-left">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="px-5 py-4 font-bold">
                                                    Bill Number
                                                </th>
                                                <th className="px-5 py-4 font-bold">
                                                    Customer
                                                </th>
                                                <th className="px-5 py-4 font-bold">
                                                    Date
                                                </th>
                                                <th className="px-5 py-4 font-bold">
                                                    Amount
                                                </th>
                                                <th className="px-5 py-4 font-bold">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody className="divide-y divide-slate-100">
                                            {filteredRecentSales.map((sale) => {
                                                const paid =
                                                    sale.paymentStatus.toLowerCase() === "paid";

                                                return (
                                                    <tr
                                                        key={sale.id}
                                                        className="transition hover:bg-emerald-50/40"
                                                    >
                                                        <td className="px-5 py-4 text-xs font-bold text-emerald-700">
                                                            {sale.billNumber}
                                                        </td>
                                                        <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                                                            {sale.customerName}
                                                        </td>
                                                        <td className="px-5 py-4 text-xs text-slate-500">
                                                            {formatDate(sale.billDate)}
                                                        </td>
                                                        <td className="px-5 py-4 text-xs font-bold text-slate-800">
                                                            {formatCurrency(sale.grandTotal)}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${paid
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-orange-50 text-orange-700"
                                                                }`}>
                                                                {sale.paymentStatus}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-10 text-center">
                                    <Receipt
                                        size={34}
                                        className="mx-auto text-slate-300"
                                    />
                                    <p className="mt-3 text-sm font-semibold text-slate-600">
                                        No matching sales found
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT HAND PANEL */}

                    <aside className="min-w-0 space-y-6">

                        {/* STOCK SUMMARY */}

                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-extrabold text-slate-900">
                                Inventory Status
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Current inventory health
                            </p>

                            <div className="mt-5 space-y-4">
                                <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-white p-2.5 text-emerald-700">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-700">
                                                Total Stock
                                            </p>
                                            <p className="mt-1 text-lg font-extrabold text-emerald-900">
                                                {loading ? "—" : data?.totalStock.toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                    <Boxes size={20} className="text-emerald-400" />
                                </div>

                                <div className="flex items-center justify-between rounded-xl bg-orange-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-white p-2.5 text-orange-600">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-orange-700">
                                                Low Stock
                                            </p>
                                            <p className="mt-1 text-lg font-extrabold text-orange-900">
                                                {loading ? "—" : data?.lowStockProducts.length}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-orange-700">
                                        Attention
                                    </span>
                                </div>

                                <div className="flex items-center justify-between rounded-xl bg-red-50 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-white p-2.5 text-red-600">
                                            <Package size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-red-700">
                                                Out of Stock
                                            </p>
                                            <p className="mt-1 text-lg font-extrabold text-red-900">
                                                {loading ? "—" : data?.outOfStockProducts.length}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-red-700">
                                        Critical
                                    </span>
                                </div>
                            </div>

                            <Link
                                to="/products"
                                className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Manage Inventory
                                <ChevronRight size={15} />
                            </Link>
                        </div>

                        {/* EXPIRY ALERTS */}

                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Expiry Alerts
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Product batch expiry dates
                                    </p>
                                </div>
                                <div className="rounded-xl bg-orange-50 p-3 text-orange-600">
                                    <CalendarDays size={20} />
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                {loading ? (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        Loading batches...
                                    </p>
                                ) : data?.expiryAlerts.length ? (
                                    data.expiryAlerts.slice(0, 5).map(
                                        (batch) => (
                                            <div
                                                key={batch.id}
                                                className="rounded-xl border border-slate-100 p-3"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-xs font-bold text-slate-800">
                                                            {batch.productName}
                                                        </p>
                                                        <p className="mt-1 text-[10px] text-slate-400">
                                                            Batch: {batch.batchNumber}
                                                        </p>
                                                    </div>

                                                    <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${batch.daysLeft < 0
                                                        ? "bg-red-50 text-red-700"
                                                        : batch.daysLeft <= 7
                                                            ? "bg-orange-50 text-orange-700"
                                                            : "bg-amber-50 text-amber-700"
                                                        }`}>
                                                        {batch.daysLeft < 0
                                                            ? "Expired"
                                                            : batch.daysLeft === 0
                                                                ? "Today"
                                                                : `${batch.daysLeft} days`}
                                                    </span>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                                                    <span>
                                                        Expiry: {formatDate(batch.expiryDate)}
                                                    </span>
                                                    <span>
                                                        Qty: {batch.quantity}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="py-7 text-center">
                                        <CheckCircle2
                                            size={30}
                                            className="mx-auto text-emerald-500"
                                        />
                                        <p className="mt-2 text-xs font-bold text-slate-700">
                                            No upcoming expiry alerts
                                        </p>
                                        <p className="mt-1 text-[10px] text-slate-400">
                                            No batches expiring within 30 days.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* LOW STOCK ALERTS */}

                        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-900">
                                        Low Stock Alerts
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Products requiring attention
                                    </p>
                                </div>
                                <AlertTriangle
                                    size={22}
                                    className="text-orange-500"
                                />
                            </div>

                            <div className="mt-5 space-y-3">
                                {loading ? (
                                    <p className="py-6 text-center text-xs text-slate-400">
                                        Loading inventory...
                                    </p>
                                ) : data?.lowStockProducts.length ? (
                                    data.lowStockProducts.slice(0, 5).map(
                                        (product) => (
                                            <div
                                                key={product.id}
                                                className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-bold text-slate-800">
                                                        {product.name}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-slate-400">
                                                        Minimum: {product.minimumStock}
                                                    </p>
                                                </div>

                                                <span className="shrink-0 rounded-lg bg-orange-50 px-2.5 py-1.5 text-[10px] font-bold text-orange-700">
                                                    {product.currentStock} left
                                                </span>
                                            </div>
                                        )
                                    )
                                ) : (
                                    <div className="py-6 text-center">
                                        <CheckCircle2
                                            size={30}
                                            className="mx-auto text-emerald-500"
                                        />
                                        <p className="mt-2 text-xs font-bold text-slate-700">
                                            Inventory looks good
                                        </p>
                                    </div>
                                )}
                            </div>

                            <Link
                                to="/products"
                                className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                View Products
                                <ChevronRight size={15} />
                            </Link>
                        </div>

                        {/* BUSINESS INFORMATION */}

                        <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-green-600 p-5 text-white shadow-sm">
                            <div className="flex items-center gap-2">
                                <Barcode size={21} />
                                <h2 className="font-extrabold">
                                    Smart Inventory
                                </h2>
                            </div>
                            <p className="mt-3 text-xs leading-6 text-emerald-50">
                                Manage product stock, billing and
                                inventory operations in one workspace.
                            </p>
                            <Link
                                to="/scan-invoice"
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                            >
                                <ScanLine size={15} />
                                Open Scanner
                            </Link>
                        </div>
                    </aside>
                </section>

                {/* BOTTOM FEATURE STRIP */}

                <section className="grid grid-cols-1 gap-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm sm:grid-cols-3">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                            <Receipt size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Billing Management
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Create and manage sales
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-3 text-blue-700">
                            <Boxes size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Inventory Management
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Monitor products and batches
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-violet-50 p-3 text-violet-700">
                            <IndianRupee size={22} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                Payment Tracking
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Monitor outstanding payments
                            </p>
                        </div>
                    </div>
                </section>

                <footer className="flex flex-col items-center justify-between gap-2 border-t border-emerald-100 py-5 text-[11px] text-slate-400 sm:flex-row">
                    <p>Balaji Stock • Business Management</p>
                    <p className="flex items-center gap-1">
                        <Clock size={12} />
                        Dashboard data from your Firestore account
                    </p>
                </footer>
            </main>
        </div>
    );
}

export default Dashboard;
