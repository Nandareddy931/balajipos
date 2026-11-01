
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownLeft,
    Banknote,
    CalendarDays,
    ChevronRight,
    Clock3,
    CreditCard,
    IndianRupee,
    LoaderCircle,
    Search,
    Smartphone,
    Wallet,
    RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBills, type Bill } from "../../services/billingService";

type PaymentMethod = "Cash" | "UPI" | "Card" | "Other";

type BillWithPaymentMethod = Bill & {
    paymentMode?: string;
    paymentMethod?: string;
};

const money = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

function getDateKey(value: unknown, fallback?: string): string {
    if (
        value &&
        typeof value === "object" &&
        "toDate" in value &&
        typeof value.toDate === "function"
    ) {
        return value.toDate().toLocaleDateString("en-CA");
    }

    if (typeof value === "string" && value) {
        return value.slice(0, 10);
    }

    return fallback ?? "";
}


function getPaymentMethod(
    bill: BillWithPaymentMethod
): PaymentMethod | null {
    const value = (
        bill.paymentMode ??
        bill.paymentMethod ??
        ""
    ).trim().toLowerCase();

    if (value === "cash") return "Cash";
    if (value === "upi") return "UPI";
    if (value === "card") return "Card";
    if (value === "other" || value.includes("wallet") || value.includes("emi")) {
        return "Other";
    }
    if (
        value === "other" ||
        value.includes("wallet") ||
        value.includes("emi")
    ) {
        return "Other";
    }

    // Do not guess methods for older bills.
    return null;
}


function getStatus(bill: Bill) {
    if (bill.paymentStatus === "Paid") {
        return {
            label: "Paid",
            className: "bg-emerald-50 text-emerald-700",
        };
    }

    if (bill.paymentStatus === "Partial") {
        return {
            label: "Partial",
            className: "bg-amber-50 text-amber-700",
        };
    }

    return {
        label: "Credit",
        className: "bg-rose-50 text-rose-700",
    };
}

function getTime(bill: Bill): string {
    const value = bill.createdAt;

    if (
        value &&
        typeof value === "object" &&
        "toDate" in value &&
        typeof value.toDate === "function"
    ) {
        return value.toDate().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return "Time unavailable";
}

export default function PaymentsMobile() {
    const navigate = useNavigate();

    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [period, setPeriod] = useState<"Today" | "7 days" | "30 days" | "All">(
        "Today",
    );
    const [methodFilter, setMethodFilter] = useState("All");
    const [visibleCount, setVisibleCount] = useState(10);

    const today = new Date().toLocaleDateString("en-CA");

    const loadBills = async () => {
        setLoading(true);
        setError("");

        try {
            const result = await getBills();
            setBills(result);
        } catch (err) {
            console.error("Unable to load payment history:", err);
            setError("Unable to load payments. Check your connection and retry.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadBills();
    }, []);

    const enrichedBills = useMemo(
        () =>
            bills.map((bill) => {
                const paymentBill = bill as BillWithPaymentMethod;

                return {
                    ...bill,
                    dateKey: getDateKey(bill.billDate, getDateKey(bill.createdAt)),
                    method: getPaymentMethod(paymentBill),
                    received: Math.max(0, Number(bill.paidAmount) || 0),
                };
            }),
        [bills],
    );

    const todayBills = useMemo(
        () => enrichedBills.filter((bill) => bill.dateKey === today),
        [enrichedBills, today],
    );

    const totalToday = todayBills.reduce(
        (sum, bill) => sum + bill.received,
        0,
    );

    const totalCollection = enrichedBills.reduce(
        (sum, bill) => sum + bill.received,
        0,
    );

    const methodTotals = useMemo(() => {
        const result = {
            Cash: 0,
            UPI: 0,
            Card: 0,
            Other: 0,
        };

        for (const bill of todayBills) {
            if (bill.method) {
                result[bill.method] += bill.received;
            }
        }

        return result;
    }, [todayBills]);

    const methodCounts = useMemo(() => {
        const result = {
            Cash: 0,
            UPI: 0,
            Card: 0,
            Other: 0,
        };

        for (const bill of todayBills) {
            if (bill.method) result[bill.method] += 1;
        }

        return result;
    }, [todayBills]);

    const unknownMethodCount = todayBills.filter(
        (bill) => !bill.method && bill.received > 0,
    ).length;

    const filteredBills = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now);

        if (period === "7 days") cutoff.setDate(now.getDate() - 6);
        if (period === "30 days") cutoff.setDate(now.getDate() - 29);

        const term = search.trim().toLowerCase();

        return enrichedBills.filter((bill) => {
            const matchesPeriod =
                period === "All" ||
                (period === "Today" && bill.dateKey === today) ||
                ((period === "7 days" || period === "30 days") &&
                    bill.dateKey >= cutoff.toLocaleDateString("en-CA") &&
                    bill.dateKey <= today);

            const matchesMethod =
                methodFilter === "All" || bill.method === methodFilter;

            const matchesSearch =
                !term ||
                bill.billNumber.toLowerCase().includes(term) ||
                bill.customerName.toLowerCase().includes(term) ||
                (bill.customerPhone ?? "").includes(term);

            return matchesPeriod && matchesMethod && matchesSearch;
        });
    }, [enrichedBills, period, methodFilter, search, today]);

    const paymentCards = [
        {
            title: "Cash",
            amount: methodTotals.Cash,
            count: methodCounts.Cash,
            icon: Banknote,
            color: "bg-emerald-50 text-emerald-700",
        },
        {
            title: "UPI",
            amount: methodTotals.UPI,
            count: methodCounts.UPI,
            icon: Smartphone,
            color: "bg-violet-50 text-violet-700",
        },
        {
            title: "Card",
            amount: methodTotals.Card,
            count: methodCounts.Card,
            icon: CreditCard,
            color: "bg-blue-50 text-blue-700",
        },
        {
            title: "Total collection",
            amount: totalCollection,
            count: enrichedBills.length,
            icon: Wallet,
            color: "bg-amber-50 text-amber-700",
        },
    ];

    return (
        <div className="min-h-screen bg-[#f2f8f5] pb-6 text-[#17334a]">
            <header className="sticky top-0 z-20 bg-[#087653] px-4 py-4 text-white shadow-md">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                        <IndianRupee size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h1 className="text-lg font-extrabold">Payments</h1>
                        <p className="text-xs text-green-100">
                            Collections & transaction history
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void loadBills()}
                        disabled={loading}
                        aria-label="Refresh payments"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 disabled:opacity-50"
                    >
                        {loading ? (
                            <LoaderCircle className="animate-spin" size={20} />
                        ) : (
                            <RefreshCw size={19} />
                        )}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-xl space-y-4 p-3">
                <section className="overflow-hidden rounded-2xl bg-[#087653] p-5 text-white shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-100">
                        <CalendarDays size={17} />
                        Today's collection
                    </div>

                    <p className="mt-3 text-3xl font-extrabold tracking-tight">
                        {money(totalToday)}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3">
                        <div>
                            <p className="text-xs text-green-100">Today's bills</p>
                            <p className="mt-1 text-lg font-bold">{todayBills.length}</p>
                        </div>

                        <div className="text-right">
                            <p className="text-xs text-green-100">Total collection</p>
                            <p className="mt-1 text-lg font-bold">
                                {money(totalCollection)}
                            </p>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-2 gap-3">
                    {paymentCards.map((item) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.title}
                                className="min-w-0 rounded-2xl border border-[#dcebe5] bg-white p-3.5 shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}
                                    >
                                        <Icon size={19} />
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-400">
                                        {item.title === "Total collection" ? "All time" : "Today"}
                                    </span>
                                </div>

                                <p className="mt-3 break-words text-xl font-extrabold">
                                    {money(item.amount)}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {item.count} {item.title === "Total collection" ? "bills" : "transactions"}
                                </p>
                            </div>
                        );
                    })}
                </section>

                {unknownMethodCount > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
                        {unknownMethodCount} of today's paid bills have no recorded payment
                        method. Cash, UPI, and card totals may therefore be incomplete.
                    </div>
                )}

                <section className="overflow-hidden rounded-2xl border border-[#dcebe5] bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h2 className="text-base font-extrabold">
                                    Recent payment transactions
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    {filteredBills.length} matching bills
                                </p>
                            </div>

                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f6f0] text-[#087653]">
                                <ArrowDownLeft size={19} />
                            </span>
                        </div>

                        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#dcebe5] bg-[#f8fcfa] px-3 py-3">
                            <Search size={18} className="shrink-0 text-[#087653]" />
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setVisibleCount(10);
                                }}
                                placeholder="Search bill, customer or phone"
                                aria-label="Search payment transactions"
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                            />
                        </div>

                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {(["Today", "7 days", "30 days", "All"] as const).map(
                                (item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => {
                                            setPeriod(item);
                                            setVisibleCount(10);
                                        }}
                                        className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold ${period === item
                                            ? "bg-[#087653] text-white"
                                            : "bg-[#eef6f2] text-slate-600"
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ),
                            )}
                        </div>

                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                            {["All", "Cash", "UPI", "Card", "Other"].map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => {
                                        setMethodFilter(item);
                                        setVisibleCount(10);
                                    }}
                                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${methodFilter === item
                                        ? "border-[#087653] bg-[#e8f6f0] text-[#087653]"
                                        : "border-slate-200 bg-white text-slate-500"
                                        }`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-rose-600">{error}</p>
                            <button
                                type="button"
                                onClick={() => void loadBills()}
                                className="mt-3 rounded-xl bg-[#087653] px-4 py-2.5 text-sm font-bold text-white"
                            >
                                Retry
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
                            <LoaderCircle className="animate-spin" size={19} />
                            Loading transactions…
                        </div>
                    ) : filteredBills.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f6f0] text-[#087653]">
                                <Wallet size={24} />
                            </div>
                            <p className="mt-3 font-bold">No transactions found</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Try another date range or search term.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="divide-y divide-slate-100">
                                {filteredBills.slice(0, visibleCount).map((bill) => {
                                    const status = getStatus(bill);

                                    return (
                                        <button
                                            key={bill.id}
                                            type="button"
                                            onClick={() => navigate(`/sales/bill/${bill.id}`)}
                                            className="block w-full p-4 text-left transition hover:bg-[#f8fcfa] active:bg-[#eef6f2]"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f6f0] text-[#087653]">
                                                    {bill.method === "Cash" ? (
                                                        <Banknote size={21} />
                                                    ) : bill.method === "UPI" ? (
                                                        <Smartphone size={21} />
                                                    ) : bill.method === "Card" ? (
                                                        <CreditCard size={21} />
                                                    ) : (
                                                        <Wallet size={21} />
                                                    )}
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-extrabold">
                                                                {bill.customerName || "Walk-in Customer"}
                                                            </p>
                                                            <p className="mt-1 truncate text-xs text-slate-500">
                                                                {bill.billNumber}
                                                            </p>
                                                        </div>

                                                        <div className="shrink-0 text-right">
                                                            <p className="text-sm font-extrabold text-[#087653]">
                                                                {money(bill.paidAmount || 0)}
                                                            </p>
                                                            <span
                                                                className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${status.className}`}
                                                            >
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <CalendarDays size={13} />
                                                            {bill.dateKey}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock3 size={13} />
                                                            {getTime(bill)}
                                                        </span>
                                                        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold">
                                                            {bill.method ?? "Method not recorded"}
                                                        </span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-xs">
                                                        <span className="text-slate-500">
                                                            Bill total: {money(bill.grandTotal || 0)}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 font-bold text-[#087653]">
                                                            View <ChevronRight size={15} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {visibleCount < filteredBills.length && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleCount((count) => count + 10)}
                                    className="w-full border-t border-slate-100 px-4 py-4 text-sm font-bold text-[#087653]"
                                >
                                    Load more transactions
                                </button>
                            )}
                        </>
                    )}
                </section>

                <p className="px-3 text-center text-[11px] leading-5 text-slate-400">
                    Collection totals are calculated from recorded paid amounts. Payment
                    method totals require a saved payment method in each bill.
                </p>
            </main>
        </div>
    );
}
