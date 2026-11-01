import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Filter, Download, Package, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
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

function StockIn() {
    const [stockIns, setStockIns] = useState<StockInRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    // --------------------------------------------------
    // Load Stock In records from Firestore
    // --------------------------------------------------
    useEffect(() => {
        const loadStockIns = async () => {
            try {
                setLoading(true);

                // Get currently authenticated user
                const user = auth.currentUser;

                if (!user) {
                    throw new Error("Please log in first.");
                }

                // Load only this user's shop records
                const stockInQuery = query(
                    collection(db, "stockIns"),
                    where("shopId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );

                const snapshot = await getDocs(stockInQuery);

                const records: StockInRecord[] = snapshot.docs.map((document) => {
                    const data = document.data();

                    return {
                        id: document.id,
                        supplier: data.supplier ?? "",
                        invoiceNumber: data.invoiceNumber ?? "",
                        invoiceDate: data.invoiceDate ?? "",
                        billMode: data.billMode ?? "",
                        deliveryDate: data.deliveryDate ?? "",
                        transport: data.transport ?? "",
                        notes: data.notes ?? "",
                        items: Array.isArray(data.items)
                            ? data.items.map((item: StockInItem) => ({
                                productId: item.productId ?? "",
                                product: item.product ?? "",
                                batch: item.batch ?? "",
                                manufacturingDate: item.manufacturingDate ?? "",
                                expiryDate: item.expiryDate ?? "",
                                pack: item.pack ?? "",
                                quantity: Number(item.quantity) || 0,
                                rate: Number(item.rate) || 0,
                                amount:
                                    Number(item.amount) ||
                                    (Number(item.quantity) || 0) *
                                    (Number(item.rate) || 0),
                            }))
                            : [],
                        subtotal: Number(data.subtotal) || 0,
                        grandTotal: Number(data.grandTotal) || 0,
                    };
                });

                setStockIns(records);

            } catch (error) {
                console.error("Failed to load stock-in records:", error);
            } finally {
                setLoading(false);
            }
        };

        loadStockIns();
    }, []);

    // --------------------------------------------------
    // Current month
    // --------------------------------------------------
    const currentMonth = useMemo(() => {
        const now = new Date();

        return `${now.getFullYear()}-${String(
            now.getMonth() + 1
        ).padStart(2, "0")}`;
    }, []);

    // --------------------------------------------------
    // Product filter options
    // --------------------------------------------------
    const products = useMemo(() => {
        const productMap = new Map<string, string>();

        stockIns.forEach((stockIn) => {
            stockIn.items.forEach((item) => {
                if (item.productId && item.product) {
                    productMap.set(item.productId, item.product);
                }
            });
        });

        return Array.from(productMap.entries()).map(([id, name]) => ({
            id,
            name,
        }));
    }, [stockIns]);

    // --------------------------------------------------
    // Supplier filter options
    // --------------------------------------------------
    const suppliers = useMemo(() => {
        const supplierSet = new Set<string>();

        stockIns.forEach((stockIn) => {
            if (stockIn.supplier) {
                supplierSet.add(stockIn.supplier);
            }
        });

        return Array.from(supplierSet).sort();
    }, [stockIns]);

    // --------------------------------------------------
    // Dashboard summary cards
    // --------------------------------------------------
    const currentMonthRecords = useMemo(() => {
        return stockIns.filter((stockIn) =>
            stockIn.invoiceDate.startsWith(currentMonth)
        );
    }, [stockIns, currentMonth]);

    const stockInThisMonth = useMemo(() => {
        return currentMonthRecords.reduce((total, stockIn) => {
            return (
                total +
                stockIn.items.reduce(
                    (itemTotal, item) => itemTotal + item.quantity,
                    0
                )
            );
        }, 0);
    }, [currentMonthRecords]);

    const purchaseValueThisMonth = useMemo(() => {
        return currentMonthRecords.reduce((total, stockIn) => {
            return (
                total +
                stockIn.items.reduce(
                    (itemTotal, item) => itemTotal + item.amount,
                    0
                )
            );
        }, 0);
    }, [currentMonthRecords]);

    const stockInTransactions = stockIns.length;

    // --------------------------------------------------
    // Flatten stock-in records into table rows
    // --------------------------------------------------
    const filteredRows = useMemo<StockInRow[]>(() => {
        const rows: StockInRow[] = [];

        stockIns.forEach((stockIn) => {
            stockIn.items.forEach((item) => {
                const matchesMonth =
                    !selectedMonth ||
                    stockIn.invoiceDate.startsWith(selectedMonth);

                const matchesProduct =
                    !selectedProduct ||
                    item.productId === selectedProduct;

                const matchesSupplier =
                    !selectedSupplier ||
                    stockIn.supplier === selectedSupplier;

                const matchesSearch =
                    !searchTerm ||
                    stockIn.invoiceNumber
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase());

                if (
                    matchesMonth &&
                    matchesProduct &&
                    matchesSupplier &&
                    matchesSearch
                ) {
                    rows.push({
                        stockInId: stockIn.id,
                        date: stockIn.invoiceDate,
                        invoiceNumber: stockIn.invoiceNumber,
                        supplier: stockIn.supplier,
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

        return rows;
    }, [
        stockIns,
        selectedMonth,
        selectedProduct,
        selectedSupplier,
        searchTerm,
    ]);

    // --------------------------------------------------
    // Filtered table totals
    // --------------------------------------------------
    const totalQuantity = useMemo(() => {
        return filteredRows.reduce((total, row) => total + row.quantity, 0);
    }, [filteredRows]);

    const totalAmount = useMemo(() => {
        return filteredRows.reduce((total, row) => total + row.amount, 0);
    }, [filteredRows]);

    // --------------------------------------------------
    // Clear filters
    // --------------------------------------------------
    const clearFilters = () => {
        setSelectedMonth("");
        setSelectedProduct("");
        setSelectedSupplier("");
        setSearchTerm("");
    };
    const exportStockIn = () => {
        if (filteredRows.length === 0) {
            alert("No stock-in records available to export.");
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

        const csvContent = [
            headers,
            ...csvRows,
        ]
            .map((row) =>
                row
                    .map((value) => {
                        const text = String(value ?? "");
                        return `"${text.replace(/"/g, '""')}"`;
                    })
                    .join(",")
            )
            .join("\n");

        const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;

        const date = new Date().toISOString().split("T")[0];

        link.download = `stock-in-${date}.csv`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Stock In
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Manage incoming stock and purchase records
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Link
                        to="/stock-in/add"
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-green-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Stock
                    </Link>

                    <Link
                        to="/scan-invoice"
                        className="inline-flex items-center gap-2 rounded-lg border border-green-600 bg-white px-4 py-2.5 text-sm font-medium text-green-700 transition hover:bg-green-50"
                    >
                        <Camera className="h-4 w-4" />
                        Scan Invoice
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                Stock In This Month
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {stockInThisMonth.toLocaleString()}
                            </p>
                        </div>

                        <div className="rounded-lg bg-green-50 p-3">
                            <Package className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                Purchase Value This Month
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                ₹{purchaseValueThisMonth.toLocaleString("en-IN")}
                            </p>
                        </div>

                        <div className="rounded-lg bg-green-50 p-3">
                            <Package className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">
                                Stock In Transactions
                            </p>

                            <p className="mt-2 text-2xl font-bold text-gray-900">
                                {stockInTransactions}
                            </p>
                        </div>

                        <div className="rounded-lg bg-green-50 p-3">
                            <Package className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-600" />

                    <h2 className="font-semibold text-gray-900">
                        Filters
                    </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Month */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Month
                        </label>

                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(event) =>
                                setSelectedMonth(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    {/* Product */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Product
                        </label>

                        <select
                            value={selectedProduct}
                            onChange={(event) =>
                                setSelectedProduct(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        >
                            <option value="">All Products</option>

                            {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                    {product.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Supplier */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Supplier
                        </label>

                        <select
                            value={selectedSupplier}
                            onChange={(event) =>
                                setSelectedSupplier(event.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        >
                            <option value="">All Suppliers</option>

                            {suppliers.map((supplier) => (
                                <option key={supplier} value={supplier}>
                                    {supplier}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search */}
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                            Search
                        </label>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                placeholder="Invoice number..."
                                className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-medium text-green-600 hover:text-green-700"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {/* Stock In History */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900">
                            Stock In History
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                            Recently received stock
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={exportStockIn}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Date
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Product
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Supplier
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Invoice No.
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Batch
                                </th>
                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Mfg. Date
                                </th>

                                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Expiry Date
                                </th>

                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Quantity
                                </th>

                                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Total
                                </th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan={9}
                                        className="px-5 py-10 text-center text-sm text-gray-500"
                                    >
                                        Loading stock-in records...
                                    </td>
                                </tr>
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-5 py-10 text-center text-sm text-gray-500"
                                    >
                                        No stock-in records found
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((row, index) => (
                                    <tr
                                        key={`${row.stockInId}-${row.productId}-${row.batch}-${index}`}
                                        className="hover:bg-gray-50"
                                    >
                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                                            {row.date || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-sm font-medium text-gray-900">
                                            {row.product || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {row.supplier || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {row.invoiceNumber || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-sm text-gray-700">
                                            {row.batch || "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                                            {row.manufacturingDate || "-"}
                                        </td>

                                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                                            {row.expiryDate || "-"}
                                        </td>

                                        <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                                            {row.quantity.toLocaleString()}
                                        </td>

                                        <td className="px-5 py-4 text-right text-sm font-medium text-gray-900">
                                            ₹{row.amount.toLocaleString("en-IN")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {!loading && filteredRows.length > 0 && (
                            <tfoot>
                                <tr className="border-t border-gray-200 bg-gray-50">
                                    <td
                                        colSpan={7}
                                        className="px-5 py-4 text-right text-sm font-semibold text-gray-700"
                                    >
                                        Total
                                    </td>

                                    <td className="px-5 py-4 text-right text-sm font-bold text-gray-900">
                                        {totalQuantity.toLocaleString()}
                                    </td>

                                    <td className="px-5 py-4 text-right text-sm font-bold text-gray-900">
                                        ₹{totalAmount.toLocaleString("en-IN")}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}

export default StockIn;