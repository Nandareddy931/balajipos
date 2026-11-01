import { useEffect, useMemo, useState } from "react";
import {
    CalendarDays,
    ChevronDown,
    Eye,
    FileText,
    Filter,
    Phone,
    Search,
    User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    getBills,
    type Bill,
    type PaymentStatus,
} from "../services/billingService";

function Sales() {
    const navigate = useNavigate();
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [paymentFilter, setPaymentFilter] =
        useState<"All" | PaymentStatus>("All");

    const [dateFilter, setDateFilter] = useState("");

    useEffect(() => {
        const loadBills = async () => {
            try {
                setLoading(true);

                const data = await getBills();

                setBills(data);
            } catch (error) {
                console.error("Error loading bills:", error);
                alert("Failed to load bills.");
            } finally {
                setLoading(false);
            }
        };

        loadBills();
    }, []);

    const filteredBills = useMemo(() => {
        const searchValue = search.trim().toLowerCase();

        return bills.filter((bill) => {
            const matchesSearch =
                !searchValue ||
                bill.billNumber.toLowerCase().includes(searchValue) ||
                bill.customerName.toLowerCase().includes(searchValue) ||
                bill.customerPhone.includes(searchValue) ||
                bill.items.some((item) =>
                    item.productName.toLowerCase().includes(searchValue)
                );

            const matchesPayment =
                paymentFilter === "All" ||
                bill.paymentStatus === paymentFilter;

            const matchesDate =
                !dateFilter ||
                bill.billDate === dateFilter;

            return (
                matchesSearch &&
                matchesPayment &&
                matchesDate
            );
        });
    }, [bills, search, paymentFilter, dateFilter]);

    const totalSales = useMemo(() => {
        return filteredBills.reduce(
            (total, bill) => total + bill.grandTotal,
            0
        );
    }, [filteredBills]);

    const totalPaid = useMemo(() => {
        return filteredBills.reduce(
            (total, bill) => total + bill.paidAmount,
            0
        );
    }, [filteredBills]);

    const totalCredit = useMemo(() => {
        return filteredBills.reduce(
            (total, bill) =>
                total + (bill.grandTotal - bill.paidAmount),
            0
        );
    }, [filteredBills]);

    const getPaymentBadge = (
        status: PaymentStatus
    ) => {
        if (status === "Paid") {
            return "bg-green-100 text-green-700";
        }

        if (status === "Partial") {
            return "bg-yellow-100 text-yellow-700";
        }

        return "bg-red-100 text-red-700";
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-green-100 p-3">
                            <FileText
                                size={24}
                                className="text-green-700"
                            />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Sales & Bills
                            </h1>

                            <p className="text-sm text-gray-500">
                                View and search all completed bills
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary cards */}
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Bills Found
                    </p>

                    <p className="mt-2 text-2xl font-bold text-gray-900">
                        {filteredBills.length}
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Total Sales
                    </p>

                    <p className="mt-2 text-2xl font-bold text-green-700">
                        ₹{totalSales.toFixed(2)}
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Amount Paid
                    </p>

                    <p className="mt-2 text-2xl font-bold text-blue-700">
                        ₹{totalPaid.toFixed(2)}
                    </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <p className="text-sm text-gray-500">
                        Outstanding
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-600">
                        ₹{totalCredit.toFixed(2)}
                    </p>
                </div>
            </div>

            {/* Search and filters */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search
                            size={19}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search bill number, customer, phone or product..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    {/* Date */}
                    <div className="relative">
                        <CalendarDays
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(event) =>
                                setDateFilter(event.target.value)
                            }
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-green-500 focus:bg-white md:w-52"
                        />
                    </div>

                    {/* Payment filter */}
                    <div className="relative">
                        <Filter
                            size={18}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />

                        <select
                            value={paymentFilter}
                            onChange={(event) =>
                                setPaymentFilter(
                                    event.target.value as
                                    | "All"
                                    | PaymentStatus
                                )
                            }
                            className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-10 text-sm outline-none focus:border-green-500 focus:bg-white md:w-48"
                        >
                            <option value="All">
                                All Payments
                            </option>

                            <option value="Paid">
                                Paid
                            </option>

                            <option value="Partial">
                                Partial
                            </option>

                            <option value="Credit">
                                Credit
                            </option>
                        </select>

                        <ChevronDown
                            size={16}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>
            </div>

            {/* Bills table */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-5 py-4">
                    <h2 className="font-semibold text-gray-900">
                        Bill History
                    </h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-sm text-gray-500">
                        Loading bills...
                    </div>
                ) : filteredBills.length === 0 ? (
                    <div className="p-10 text-center">
                        <FileText
                            size={40}
                            className="mx-auto text-gray-300"
                        />

                        <p className="mt-3 font-medium text-gray-700">
                            No bills found
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                            Try changing your search or filters.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop/tablet table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-5 py-4">
                                            Bill
                                        </th>

                                        <th className="px-5 py-4">
                                            Customer
                                        </th>

                                        <th className="px-5 py-4">
                                            Date
                                        </th>

                                        <th className="px-5 py-4">
                                            Items
                                        </th>

                                        <th className="px-5 py-4">
                                            Total
                                        </th>

                                        <th className="px-5 py-4">
                                            Payment
                                        </th>

                                        <th className="px-5 py-4 text-right">
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredBills.map((bill) => (
                                        <tr
                                            key={bill.id}
                                            className="transition hover:bg-green-50/40"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    {bill.billNumber}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User
                                                        size={16}
                                                        className="text-gray-400"
                                                    />

                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {bill.customerName}
                                                        </p>

                                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                                                            <Phone size={12} />
                                                            {bill.customerPhone}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-sm text-gray-600">
                                                {bill.billDate}
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="text-sm font-medium text-gray-800">
                                                    {bill.items.length} item
                                                    {bill.items.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </p>

                                                <p className="max-w-48 truncate text-xs text-gray-500">
                                                    {bill.items
                                                        .map(
                                                            (item) =>
                                                                item.productName
                                                        )
                                                        .join(", ")}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-gray-900">
                                                    ₹
                                                    {bill.grandTotal.toFixed(
                                                        2
                                                    )}
                                                </p>

                                                <p className="text-xs text-gray-500">
                                                    Paid ₹
                                                    {bill.paidAmount.toFixed(
                                                        2
                                                    )}
                                                </p>
                                            </td>

                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPaymentBadge(
                                                        bill.paymentStatus
                                                    )}`}
                                                >
                                                    {bill.paymentStatus}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(`/sales/bill/${bill.id}`)
                                                    }
                                                    className="inline-flex items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-50"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="divide-y divide-gray-100 md:hidden">
                            {filteredBills.map((bill) => (
                                <div
                                    key={bill.id}
                                    className="p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {bill.billNumber}
                                            </p>

                                            <p className="mt-1 text-sm text-gray-700">
                                                {bill.customerName}
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                {bill.customerPhone}
                                            </p>
                                        </div>

                                        <span
                                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getPaymentBadge(
                                                bill.paymentStatus
                                            )}`}
                                        >
                                            {bill.paymentStatus}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3">
                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Date
                                            </p>

                                            <p className="mt-1 text-sm font-medium text-gray-800">
                                                {bill.billDate}
                                            </p>
                                        </div>

                                        <div>
                                            <p className="text-xs text-gray-500">
                                                Total
                                            </p>

                                            <p className="mt-1 text-sm font-semibold text-gray-900">
                                                ₹
                                                {bill.grandTotal.toFixed(
                                                    2
                                                )}
                                            </p>
                                        </div>

                                        <div className="col-span-2">
                                            <p className="text-xs text-gray-500">
                                                Products
                                            </p>

                                            <p className="mt-1 text-sm text-gray-700">
                                                {bill.items
                                                    .map(
                                                        (item) =>
                                                            `${item.productName} × ${item.quantity}`
                                                    )
                                                    .join(", ")}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            navigate(`/sales/bill/${bill.id}`)
                                        }
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-green-200 py-2.5 text-sm font-medium text-green-700 hover:bg-green-50"
                                    >
                                        <Eye size={16} />
                                        View Bill
                                    </button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default Sales;