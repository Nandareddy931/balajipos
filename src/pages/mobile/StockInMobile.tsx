
import { useEffect, useMemo, useState } from "react";
import {
    Camera,
    ChevronRight,
    ClipboardList,
    Download,
    IndianRupee,
    Package,
    Plus,
    Search,
    X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

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
    items: StockInItem[];
    subtotal: number;
    grandTotal: number;
}

interface StockInRow {
    stockInId: string;
    date: string;
    invoiceNumber: string;
    supplier: string;
    product: string;
    productId: string;
    batch: string;
    manufacturingDate: string;
    expiryDate: string;
    pack: string;
    quantity: number;
    rate: number;
    amount: number;
}

const formatMoney = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
    })}`;

function StockInMobile() {
    const [stockIns, setStockIns] = useState<StockInRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // Load the existing Stock In records from Firestore.
    useEffect(() => {
        let cancelled = false;

        const loadStockIns = async () => {
            try {
                setLoading(true);
                setLoadError(false);

                const snapshot = await getDocs(collection(db, "stockIns"));

                const records: StockInRecord[] = snapshot.docs.map((document) => {
                    const data = document.data();

                    const items: StockInItem[] = Array.isArray(data.items)
                        ? data.items.map((item: StockInItem) => {
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
                        items,
                        subtotal: Number(data.subtotal) || 0,
                        grandTotal: Number(data.grandTotal) || 0,
                    };
                });

                if (!cancelled) {
                    setStockIns(records);
                }
            } catch (error) {
                console.error("Failed to load stock-in records:", error);

                if (!cancelled) {
                    setLoadError(true);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadStockIns();

        return () => {
            cancelled = true;
        };
    }, []);

    // Current month in YYYY-MM format.
    const currentMonth = useMemo(() => {
        const now = new Date();

        return `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}`;
    }, []);

    const products = useMemo(() => {
        const productMap = new Map<string, string>();

        stockIns.forEach((record) => {
            record.items.forEach((item) => {
                if (item.productId && item.product) {
                    productMap.set(item.productId, item.product);
                }
            });
        });

        return Array.from(productMap.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [stockIns]);

    const suppliers = useMemo(() => {
        const supplierSet = new Set<string>();

        stockIns.forEach((record) => {
            if (record.supplier) {
                supplierSet.add(record.supplier);
            }
        });

        return Array.from(supplierSet).sort();
    }, [stockIns]);

    const currentMonthRecords = useMemo(
        () =>
            stockIns.filter((record) =>
                record.invoiceDate.startsWith(currentMonth)
            ),
        [stockIns, currentMonth]
    );

    const stockInThisMonth = useMemo(
        () =>
            currentMonthRecords.reduce(
                (total, record) =>
                    total +
                    record.items.reduce(
                        (itemTotal, item) => itemTotal + item.quantity,
                        0
                    ),
                0
            ),
        [currentMonthRecords]
    );

    const purchaseValueThisMonth = useMemo(
        () =>
            currentMonthRecords.reduce(
                (total, record) =>
                    total +
                    record.items.reduce(
                        (itemTotal, item) => itemTotal + item.amount,
                        0
                    ),
                0
            ),
        [currentMonthRecords]
    );

    const filteredRows = useMemo<StockInRow[]>(() => {
        const rows: StockInRow[] = [];
        const search = searchTerm.trim().toLowerCase();

        stockIns.forEach((record) => {
            record.items.forEach((item) => {
                const matchesMonth =
                    !selectedMonth || record.invoiceDate.startsWith(selectedMonth);

                const matchesProduct =
                    !selectedProduct || item.productId === selectedProduct;

                const matchesSupplier =
                    !selectedSupplier || record.supplier === selectedSupplier;

                const matchesSearch =
                    !search ||
                    record.invoiceNumber.toLowerCase().includes(search) ||
                    record.supplier.toLowerCase().includes(search) ||
                    item.product.toLowerCase().includes(search) ||
                    item.batch.toLowerCase().includes(search);

                if (
                    matchesMonth &&
                    matchesProduct &&
                    matchesSupplier &&
                    matchesSearch
                ) {
                    rows.push({
                        stockInId: record.id,
                        date: record.invoiceDate,
                        invoiceNumber: record.invoiceNumber,
                        supplier: record.supplier,
                        product: item.product,
                        productId: item.productId,
                        batch: item.batch,
                        manufacturingDate: item.manufacturingDate,
                        expiryDate: item.expiryDate,
                        pack: item.pack,
                        quantity: item.quantity,
                        rate: item.rate,
                        amount: item.amount,
                    });
                }
            });
        });

        return rows.sort((a, b) => b.date.localeCompare(a.date));
    }, [
        stockIns,
        selectedMonth,
        selectedProduct,
        selectedSupplier,
        searchTerm,
    ]);

    const totalQuantity = useMemo(
        () => filteredRows.reduce((total, row) => total + row.quantity, 0),
        [filteredRows]
    );

    const totalAmount = useMemo(
        () => filteredRows.reduce((total, row) => total + row.amount, 0),
        [filteredRows]
    );

    const clearFilters = () => {
        setSelectedMonth("");
        setSelectedProduct("");
        setSelectedSupplier("");
        setSearchTerm("");
    };

    const exportStockIn = () => {
        if (filteredRows.length === 0) {
            window.alert("No stock-in records available to export.");
            return;
        }

        const headers = [
            "Date",
            "Product",
            "Supplier",
            "Invoice Number",
            "Batch",
            "Pack",
            "Quantity",
            "Rate",
            "Total",
        ];

        const csvRows = filteredRows.map((row) => [
            row.date,
            row.product,
            row.supplier,
            row.invoiceNumber,
            row.batch,
            row.pack,
            row.quantity,
            row.rate,
            row.amount,
        ]);

        const csvContent = [headers, ...csvRows]
            .map((row) =>
                row
                    .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\r\n");

        const blob = new Blob(["\uFEFF", csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `stock-in-${new Date()
            .toISOString()
            .split("T")[0]}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-[#f3f8f5] pb-6">
            {/* Green mobile header */}
            <header className="bg-gradient-to-r from-green-900 to-green-700 px-4 pb-5 pt-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-semibold tracking-[0.18em] text-green-200">
                            BALAJI STOCK
                        </p>
                        <h1 className="mt-1 text-xl font-bold">Stock In</h1>
                        <p className="mt-1 text-xs text-green-100">
                            Incoming stock and purchases
                        </p>
                    </div>

                    <div className="rounded-2xl bg-white/15 p-3">
                        <Package className="h-7 w-7" />
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                        to="/stock-in/add"
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 py-3 text-sm font-bold text-green-900 shadow-sm active:scale-[0.98]"
                    >
                        <Plus className="h-4 w-4" />
                        Add Stock
                    </Link>

                    <Link
                        to="/scan-invoice"
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 bg-green-800 px-3 py-3 text-sm font-semibold text-white active:scale-[0.98]"
                    >
                        <Camera className="h-4 w-4" />
                        Scan Invoice
                    </Link>
                </div>
            </header>

            <main className="space-y-4 px-3 pt-4">
                {/* Summary cards */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-green-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Package className="h-4 w-4 text-green-700" />
                            <span>Stock this month</span>
                        </div>

                        <p className="mt-3 text-2xl font-extrabold text-gray-900">
                            {stockInThisMonth.toLocaleString("en-IN")}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-500">
                            Total quantity received
                        </p>
                    </div>

                    <div className="rounded-2xl border border-green-100 bg-white p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <IndianRupee className="h-4 w-4 text-green-700" />
                            <span>Purchase value</span>
                        </div>

                        <p className="mt-3 break-words text-xl font-extrabold text-gray-900">
                            {formatMoney(purchaseValueThisMonth)}
                        </p>

                        <p className="mt-1 text-[11px] text-gray-500">This month</p>
                    </div>

                    <div className="col-span-2 flex items-center justify-between rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                        <div>
                            <p className="text-sm text-gray-500">Stock In transactions</p>
                            <p className="mt-1 text-2xl font-extrabold text-gray-900">
                                {stockIns.length.toLocaleString("en-IN")}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Total recorded invoices
                            </p>
                        </div>

                        <div className="rounded-xl bg-green-50 p-3">
                            <ClipboardList className="h-7 w-7 text-green-700" />
                        </div>
                    </div>
                </section>

                {/* Search and filters */}
                <section className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold text-gray-900">
                        Find stock records
                    </h2>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search product, supplier, invoice..."
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                Month
                            </label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(event) => setSelectedMonth(event.target.value)}
                                className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2 py-3 text-xs outline-none focus:border-green-500"
                            />
                        </div>

                        <div className="min-w-0">
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                Supplier
                            </label>
                            <select
                                value={selectedSupplier}
                                onChange={(event) => setSelectedSupplier(event.target.value)}
                                className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2 py-3 text-xs outline-none focus:border-green-500"
                            >
                                <option value="">All Suppliers</option>
                                {suppliers.map((supplier) => (
                                    <option key={supplier} value={supplier}>
                                        {supplier}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-2 min-w-0">
                            <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                                Product
                            </label>
                            <select
                                value={selectedProduct}
                                onChange={(event) => setSelectedProduct(event.target.value)}
                                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-green-500"
                            >
                                <option value="">All Products</option>
                                {products.map((product) => (
                                    <option key={product.id} value={product.id}>
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-gray-600 active:bg-gray-100"
                        >
                            <X className="h-4 w-4" />
                            Clear filters
                        </button>

                        <button
                            type="button"
                            onClick={exportStockIn}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-3 py-2.5 text-xs font-bold text-white active:bg-green-800"
                        >
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                    </div>
                </section>

                {/* Stock In history */}
                <section>
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900">
                                Stock In History
                            </h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Recent incoming stock records
                            </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-green-100 px-3 py-1.5 text-xs font-bold text-green-800">
                            {filteredRows.length} items
                        </span>
                    </div>

                    {loading ? (
                        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-green-700 border-t-transparent" />
                            <p className="mt-3 text-sm text-gray-500">
                                Loading stock-in records...
                            </p>
                        </div>
                    ) : loadError ? (
                        <div className="rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm">
                            <p className="font-semibold text-red-700">
                                Could not load stock records
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                                Check your internet connection and Firebase access, then reload
                                the page.
                            </p>
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
                            <Package className="mx-auto h-10 w-10 text-gray-300" />
                            <p className="mt-3 font-bold text-gray-800">
                                No stock-in records found
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Try another search or clear the filters.
                            </p>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 rounded-lg bg-green-50 px-4 py-2 text-sm font-bold text-green-800"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredRows.map((row, index) => (
                                <article
                                    key={`${row.stockInId}-${row.productId}-${row.batch}-${index}`}
                                    className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3 p-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="break-words text-sm font-bold leading-5 text-gray-900">
                                                {row.product || "Unnamed product"}
                                            </h3>
                                            <p className="mt-1 break-words text-xs text-gray-500">
                                                {row.supplier || "Supplier not specified"}
                                            </p>
                                        </div>

                                        <div className="shrink-0 text-right">
                                            <p className="text-[11px] text-gray-500">Total amount</p>
                                            <p className="mt-1 text-base font-extrabold text-green-800">
                                                {formatMoney(row.amount)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 border-y border-gray-100 bg-gray-50/80 p-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">Invoice No.</p>
                                            <p className="mt-1 break-words text-xs font-semibold text-gray-800">
                                                {row.invoiceNumber || "-"}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">Invoice date</p>
                                            <p className="mt-1 break-words text-xs font-semibold text-gray-800">
                                                {row.date || "-"}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">Batch number</p>
                                            <p className="mt-1 break-words text-xs font-medium text-gray-800">
                                                {row.batch || "-"}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">Pack / Qty</p>
                                            <p className="mt-1 break-words text-xs font-medium text-gray-800">
                                                {row.pack || "-"} /{" "}
                                                {row.quantity.toLocaleString("en-IN")}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">
                                                Manufacturing date
                                            </p>
                                            <p className="mt-1 break-words text-xs text-gray-800">
                                                {row.manufacturingDate || "-"}
                                            </p>
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-500">Expiry date</p>
                                            <p className="mt-1 break-words text-xs text-gray-800">
                                                {row.expiryDate || "-"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 px-3 py-3">
                                        <div>
                                            <p className="text-[11px] text-gray-500">Rate per unit</p>
                                            <p className="mt-1 text-xs font-semibold text-gray-800">
                                                {formatMoney(row.rate)}
                                            </p>
                                        </div>

                                        <Link
                                            to="/stock-in/add"
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-800 active:bg-green-100"
                                        >
                                            Add stock
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>

                {/* Totals for the filtered results */}
                {!loading && !loadError && filteredRows.length > 0 && (
                    <section className="rounded-2xl border border-green-100 bg-green-50 p-4">
                        <h3 className="text-sm font-extrabold text-green-900">
                            Filtered Summary
                        </h3>

                        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                            <span className="text-gray-600">Total quantity</span>
                            <span className="font-bold text-gray-900">
                                {totalQuantity.toLocaleString("en-IN")}
                            </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-green-100 pt-3 text-sm">
                            <span className="text-gray-600">Total amount</span>
                            <span className="text-base font-extrabold text-green-900">
                                {formatMoney(totalAmount)}
                            </span>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

export default StockInMobile;
