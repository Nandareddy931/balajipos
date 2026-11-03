
import { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Filter,
    Download,
    Package,
    Camera,
    CalendarDays,
    ReceiptText,
    ChevronDown,
    ChevronUp,
    Truck,
    RefreshCw,
    FileText,
    IndianRupee,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

interface StockInItem {
    productId: string;
    product: string;
    batch: string;
    manufacturingDate: string;
    expiryDate: string;
    pack: string;
    quantity: number;
    rate: number;
    amount: number;
}

interface StockInRecord {
    id: string;
    supplier: string;
    invoiceNumber: string;
    invoiceDate: string;
    billMode?: string;
    deliveryDate?: string;
    transport?: string;
    notes?: string;
    items: StockInItem[];
    subtotal: number;
    grandTotal: number;
}

function formatCurrency(value: number) {
    return `₹${value.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value: string) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function StockIn() {
    const [stockIns, setStockIns] = useState<StockInRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(
        new Set()
    );

    // Load stock-in records belonging to the authenticated shop.
    const loadStockIns = async () => {
        const user = auth.currentUser;

        if (!user) {
            setStockIns([]);
            setLoadError("Please log in to view stock-in records.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setLoadError("");

            const stockInQuery = query(
                collection(db, "stockIns"),
                where("shopId", "==", user.uid),
                orderBy("createdAt", "desc")
            );

            const snapshot = await getDocs(stockInQuery);

            const records: StockInRecord[] = snapshot.docs.map((document) => {
                const data = document.data();

                const items: StockInItem[] = Array.isArray(data.items)
                    ? data.items.map((item: Partial<StockInItem>) => {
                        const quantity = Number(item.quantity) || 0;
                        const rate = Number(item.rate) || 0;

                        return {
                            productId: item.productId ?? "",
                            product: item.product ?? "",
                            batch: item.batch ?? "",
                            manufacturingDate: item.manufacturingDate ?? "",
                            expiryDate: item.expiryDate ?? "",
                            pack: item.pack ?? "",
                            quantity,
                            rate,
                            amount: Number(item.amount) || quantity * rate,
                        };
                    })
                    : [];

                return {
                    id: document.id,
                    supplier: data.supplier ?? "",
                    invoiceNumber: data.invoiceNumber ?? "",
                    invoiceDate: data.invoiceDate ?? "",
                    billMode: data.billMode ?? "",
                    deliveryDate: data.deliveryDate ?? "",
                    transport: data.transport ?? "",
                    notes: data.notes ?? "",
                    items,
                    subtotal: Number(data.subtotal) || 0,
                    grandTotal: Number(data.grandTotal) || 0,
                };
            });

            setStockIns(records);
        } catch (error) {
            console.error("Failed to load stock-in records:", error);
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Unable to load stock-in records."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadStockIns();
    }, []);

    // Current month for dashboard metrics.
    const currentMonth = useMemo(() => {
        const now = new Date();

        return `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}`;
    }, []);

    // Available products for filtering.
    const products = useMemo(() => {
        const productMap = new Map<string, string>();

        stockIns.forEach((record) => {
            record.items.forEach((item) => {
                if (item.productId && item.product) {
                    productMap.set(item.productId, item.product);
                }
            });
        });

        return Array.from(productMap, ([id, name]) => ({ id, name })).sort(
            (a, b) => a.name.localeCompare(b.name)
        );
    }, [stockIns]);

    // Available suppliers for filtering.
    const suppliers = useMemo(
        () =>
            Array.from(
                new Set(
                    stockIns
                        .map((record) => record.supplier)
                        .filter(Boolean)
                )
            ).sort(),
        [stockIns]
    );

    // Dashboard metrics.
    const monthlyRecords = useMemo(
        () =>
            stockIns.filter((record) =>
                record.invoiceDate.startsWith(currentMonth)
            ),
        [stockIns, currentMonth]
    );

    const monthlyQuantity = useMemo(
        () =>
            monthlyRecords.reduce(
                (total, record) =>
                    total +
                    record.items.reduce(
                        (itemTotal, item) => itemTotal + item.quantity,
                        0
                    ),
                0
            ),
        [monthlyRecords]
    );

    const monthlyPurchaseValue = useMemo(
        () =>
            monthlyRecords.reduce(
                (total, record) => total + record.grandTotal,
                0
            ),
        [monthlyRecords]
    );

    // Apply filters while keeping invoice records grouped.
    const filteredRecords = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        return stockIns
            .filter((record) => {
                const matchesMonth =
                    !selectedMonth ||
                    record.invoiceDate.startsWith(selectedMonth);

                const matchesSupplier =
                    !selectedSupplier ||
                    record.supplier === selectedSupplier;

                const matchesSearch =
                    !search ||
                    record.invoiceNumber.toLowerCase().includes(search) ||
                    record.supplier.toLowerCase().includes(search);

                return matchesMonth && matchesSupplier && matchesSearch;
            })
            .map((record) => {
                const filteredItems = selectedProduct
                    ? record.items.filter(
                        (item) => item.productId === selectedProduct
                    )
                    : record.items;

                return {
                    ...record,
                    items: filteredItems,
                };
            })
            .filter((record) => record.items.length > 0);
    }, [
        stockIns,
        selectedMonth,
        selectedProduct,
        selectedSupplier,
        searchTerm,
    ]);

    const filteredQuantity = useMemo(
        () =>
            filteredRecords.reduce(
                (total, record) =>
                    total +
                    record.items.reduce(
                        (itemTotal, item) => itemTotal + item.quantity,
                        0
                    ),
                0
            ),
        [filteredRecords]
    );

    const filteredAmount = useMemo(
        () =>
            filteredRecords.reduce(
                (total, record) =>
                    total +
                    (selectedProduct
                        ? record.items.reduce(
                            (sum, item) => sum + item.amount,
                            0
                        )
                        : record.grandTotal),
                0
            ),
        [filteredRecords, selectedProduct]
    );

    const clearFilters = () => {
        setSelectedMonth("");
        setSelectedProduct("");
        setSelectedSupplier("");
        setSearchTerm("");
    };

    const toggleInvoice = (id: string) => {
        setExpandedInvoices((current) => {
            const next = new Set(current);

            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }

            return next;
        });
    };

    // Export the currently filtered product rows.
    const exportStockIn = () => {
        if (filteredRecords.length === 0) {
            alert("No stock-in records available to export.");
            return;
        }

        const headers = [
            "Date",
            "Invoice Number",
            "Supplier",
            "Product",
            "Batch",
            "Manufacturing Date",
            "Expiry Date",
            "Pack",
            "Quantity",
            "Rate",
            "Amount",
        ];

        const rows = filteredRecords.flatMap((record) =>
            record.items.map((item) => [
                record.invoiceDate,
                record.invoiceNumber,
                record.supplier,
                item.product,
                item.batch,
                item.manufacturingDate,
                item.expiryDate,
                item.pack,
                item.quantity,
                item.rate,
                item.amount,
            ])
        );

        const csv = [headers, ...rows]
            .map((row) =>
                row
                    .map((value) => {
                        const text = String(value ?? "");
                        return `"${text.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            )
            .join("\n");

        const blob = new Blob(["\uFEFF", csv], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `stock-in-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    };

    const hasFilters =
        Boolean(selectedMonth) ||
        Boolean(selectedProduct) ||
        Boolean(selectedSupplier) ||
        Boolean(searchTerm);

    return (
        <div className="min-w-0 space-y-5 pb-6">
            {/* Page header */}
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-blue-50 p-2.5">
                            <Package className="h-6 w-6 text-blue-600" />
                        </div>

                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                Stock In
                            </h1>
                            <p className="mt-0.5 text-sm text-slate-500">
                                Manage incoming stock and purchase records
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Link
                        to="/scan-invoice"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <Camera className="h-4 w-4" />
                        <span>Import Stock</span>
                    </Link>

                    <button
                        type="button"
                        onClick={exportStockIn}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                        <Download className="h-4 w-4" />
                        <span>Export</span>
                    </button>

                    <Link
                        to="/stock-in/add"
                        className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 sm:col-span-1"
                    >
                        <Plus className="h-4 w-4" />
                        New Stock In
                    </Link>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-blue-100 p-2">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-blue-700">
                            This month
                        </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Stock Received
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                        {monthlyQuantity.toLocaleString("en-IN")}
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-emerald-100 p-2">
                            <IndianRupee className="h-5 w-5 text-emerald-600" />
                        </div>
                        <span className="text-xs font-medium text-emerald-700">
                            This month
                        </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Purchase Value
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                        {formatCurrency(monthlyPurchaseValue)}
                    </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <div className="rounded-xl bg-violet-100 p-2">
                            <ReceiptText className="h-5 w-5 text-violet-600" />
                        </div>
                        <span className="text-xs font-medium text-violet-700">
                            All time
                        </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                        Stock In Transactions
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                        {stockIns.length.toLocaleString("en-IN")}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <h2 className="text-sm font-semibold text-slate-800">
                            Filter Stock In
                        </h2>
                    </div>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="relative">
                        <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(event) =>
                                setSelectedMonth(event.target.value)
                            }
                            aria-label="Filter by month"
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <select
                        value={selectedProduct}
                        onChange={(event) =>
                            setSelectedProduct(event.target.value)
                        }
                        aria-label="Filter by product"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">All Products</option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={selectedSupplier}
                        onChange={(event) =>
                            setSelectedSupplier(event.target.value)
                        }
                        aria-label="Filter by supplier"
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map((supplier) => (
                            <option key={supplier} value={supplier}>
                                {supplier}
                            </option>
                        ))}
                    </select>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            placeholder="Search invoice or supplier..."
                            aria-label="Search stock-in records"
                            className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>
                </div>
            </section>

            {/* History heading and totals */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
                    <div>
                        <h2 className="font-bold text-slate-900">
                            Stock In History
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                            {filteredRecords.length} invoice
                            {filteredRecords.length === 1 ? "" : "s"} found
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                            <span className="text-xs text-slate-500">
                                Quantity
                            </span>
                            <p className="font-bold text-slate-900">
                                {filteredQuantity.toLocaleString("en-IN")}
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">
                                Total amount
                            </span>
                            <p className="font-bold text-blue-700">
                                {formatCurrency(filteredAmount)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14">
                        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
                        <p className="text-sm text-slate-500">
                            Loading stock-in records...
                        </p>
                    </div>
                )}

                {/* Error state */}
                {!loading && loadError && (
                    <div className="flex flex-col items-center px-4 py-12 text-center">
                        <p className="text-sm font-medium text-red-600">
                            {loadError}
                        </p>
                        <button
                            type="button"
                            onClick={() => void loadStockIns()}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try again
                        </button>
                    </div>
                )}

                {/* Empty state */}
                {!loading && !loadError && filteredRecords.length === 0 && (
                    <div className="flex flex-col items-center px-4 py-14 text-center">
                        <div className="rounded-2xl bg-slate-100 p-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mt-4 font-semibold text-slate-800">
                            No stock-in records found
                        </h3>
                        <p className="mt-1 max-w-sm text-sm text-slate-500">
                            {hasFilters
                                ? "Try changing your filters or clearing them."
                                : "Your incoming stock invoices will appear here."}
                        </p>

                        {hasFilters ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 text-sm font-semibold text-blue-600"
                            >
                                Clear filters
                            </button>
                        ) : (
                            <Link
                                to="/stock-in/add"
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                            >
                                <Plus className="h-4 w-4" />
                                Add your first stock
                            </Link>
                        )}
                    </div>
                )}

                {/* Desktop/tablet invoice table */}
                {!loading && !loadError && filteredRecords.length > 0 && (
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[850px] text-left">
                            <thead className="bg-slate-50">
                                <tr className="border-b border-slate-200">
                                    {[
                                        "Invoice Date",
                                        "Invoice Number",
                                        "Supplier",
                                        "Products",
                                        "Quantity",
                                        "Amount",
                                        "Details",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="whitespace-nowrap px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredRecords.map((record) => {
                                    const quantity = record.items.reduce(
                                        (sum, item) => sum + item.quantity,
                                        0
                                    );

                                    const amount = selectedProduct
                                        ? record.items.reduce(
                                            (sum, item) => sum + item.amount,
                                            0
                                        )
                                        : record.grandTotal;

                                    return (
                                        <tr
                                            key={record.id}
                                            className="transition hover:bg-blue-50/40"
                                        >
                                            <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                                                {formatDate(record.invoiceDate)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-slate-800">
                                                    {record.invoiceNumber || "-"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <Truck className="h-4 w-4 text-slate-400" />
                                                    {record.supplier || "-"}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-sm text-slate-600">
                                                {record.items.length} item
                                                {record.items.length === 1
                                                    ? ""
                                                    : "s"}
                                            </td>
                                            <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                                {quantity.toLocaleString("en-IN")}
                                            </td>
                                            <td className="whitespace-nowrap px-5 py-4 text-sm font-bold text-slate-900">
                                                {formatCurrency(amount)}
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleInvoice(record.id)
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    {expandedInvoices.has(record.id)
                                                        ? "Hide"
                                                        : "View"}
                                                    {expandedInvoices.has(record.id) ? (
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Expanded invoice details */}
                        {filteredRecords.map(
                            (record) =>
                                expandedInvoices.has(record.id) && (
                                    <div
                                        key={`details-${record.id}`}
                                        className="border-t border-blue-100 bg-blue-50/40 p-5"
                                    >
                                        <div className="mb-3 flex flex-wrap justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-800">
                                                    Invoice{" "}
                                                    {record.invoiceNumber || "-"}
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Supplier: {record.supplier || "-"}
                                                    {record.billMode
                                                        ? ` • ${record.billMode}`
                                                        : ""}
                                                </p>
                                            </div>
                                            {record.transport && (
                                                <p className="text-xs text-slate-500">
                                                    Transport: {record.transport}
                                                </p>
                                            )}
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                            <table className="w-full min-w-[700px] text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        {[
                                                            "Product",
                                                            "Batch",
                                                            "Mfg. Date",
                                                            "Expiry Date",
                                                            "Pack",
                                                            "Qty",
                                                            "Rate",
                                                            "Amount",
                                                        ].map((heading) => (
                                                            <th
                                                                key={heading}
                                                                className="px-3 py-3 text-left text-xs font-semibold text-slate-500"
                                                            >
                                                                {heading}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {record.items.map(
                                                        (item, index) => (
                                                            <tr
                                                                key={`${item.productId}-${item.batch}-${index}`}
                                                            >
                                                                <td className="px-3 py-3 font-medium text-slate-800">
                                                                    {item.product}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-600">
                                                                    {item.batch || "-"}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-600">
                                                                    {formatDate(item.manufacturingDate)}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-600">
                                                                    {formatDate(item.expiryDate)}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-600">
                                                                    {item.pack || "-"}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-700">
                                                                    {item.quantity}
                                                                </td>
                                                                <td className="px-3 py-3 text-slate-700">
                                                                    {formatCurrency(item.rate)}
                                                                </td>
                                                                <td className="px-3 py-3 font-semibold text-slate-800">
                                                                    {formatCurrency(item.amount)}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {record.notes && (
                                            <p className="mt-3 text-xs text-slate-500">
                                                Notes: {record.notes}
                                            </p>
                                        )}
                                    </div>
                                )
                        )}
                    </div>
                )}

                {/* Mobile invoice cards */}
                {!loading && !loadError && filteredRecords.length > 0 && (
                    <div className="space-y-3 p-3 md:hidden">
                        {filteredRecords.map((record) => {
                            const expanded = expandedInvoices.has(record.id);

                            const amount = selectedProduct
                                ? record.items.reduce(
                                    (sum, item) => sum + item.amount,
                                    0
                                )
                                : record.grandTotal;

                            return (
                                <article
                                    key={record.id}
                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleInvoice(record.id)}
                                        className="w-full p-4 text-left transition active:bg-slate-50"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="rounded-xl bg-blue-50 p-2.5">
                                                    <ReceiptText className="h-5 w-5 text-blue-600" />
                                                </div>

                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-bold text-slate-900">
                                                        {record.invoiceNumber || "Invoice"}
                                                    </h3>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {formatDate(record.invoiceDate)}
                                                    </p>
                                                </div>
                                            </div>

                                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                                Completed
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-end justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-xs text-slate-500">
                                                    {record.supplier || "Supplier not specified"}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {record.items.length} product
                                                    {record.items.length === 1
                                                        ? ""
                                                        : "s"}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-base font-bold text-slate-900">
                                                    {formatCurrency(amount)}
                                                </p>
                                                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
                                                    {expanded ? "Hide details" : "View details"}
                                                    {expanded ? (
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {expanded && (
                                        <div className="border-t border-slate-100 bg-slate-50 p-3">
                                            <p className="mb-2 text-xs font-semibold text-slate-600">
                                                Products in this invoice
                                            </p>

                                            <div className="space-y-2">
                                                {record.items.map((item, index) => (
                                                    <div
                                                        key={`${item.productId}-${item.batch}-${index}`}
                                                        className="rounded-lg border border-slate-200 bg-white p-3"
                                                    >
                                                        <div className="flex justify-between gap-2">
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                {item.product}
                                                            </p>
                                                            <p className="shrink-0 text-sm font-bold text-slate-900">
                                                                {formatCurrency(item.amount)}
                                                            </p>
                                                        </div>

                                                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                                                            <p>
                                                                Qty:{" "}
                                                                <span className="font-semibold text-slate-700">
                                                                    {item.quantity}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Rate:{" "}
                                                                <span className="font-semibold text-slate-700">
                                                                    {formatCurrency(item.rate)}
                                                                </span>
                                                            </p>
                                                            <p>
                                                                Batch: {item.batch || "-"}
                                                            </p>
                                                            <p>
                                                                Pack: {item.pack || "-"}
                                                            </p>
                                                            <p>
                                                                Mfg: {formatDate(item.manufacturingDate)}
                                                            </p>
                                                            <p>
                                                                Exp: {formatDate(item.expiryDate)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {(record.transport || record.notes) && (
                                                <div className="mt-3 space-y-1 text-xs text-slate-500">
                                                    {record.transport && (
                                                        <p>
                                                            Transport: {record.transport}
                                                        </p>
                                                    )}
                                                    {record.notes && (
                                                        <p>Notes: {record.notes}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}

export default StockIn;
