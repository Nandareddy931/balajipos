import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

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

function StockInHistory() {
    const [stockIns, setStockIns] = useState<StockInRecord[]>([]);
    const [selectedMonth, setSelectedMonth] = useState("");
    const [selectedProduct, setSelectedProduct] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStockIns = async () => {
            try {
                const snapshot = await getDocs(
                    collection(db, "stockIns")
                );

                const records: StockInRecord[] = snapshot.docs.map(
                    (document) => ({
                        id: document.id,
                        ...(document.data() as Omit<
                            StockInRecord,
                            "id"
                        >),
                    })
                );

                setStockIns(records);
            } catch (error) {
                console.error(
                    "Failed to load Stock In history:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        loadStockIns();
    }, []);

    const products = useMemo(() => {
        const productMap = new Map<string, string>();

        stockIns.forEach((stockIn) => {
            stockIn.items.forEach((item) => {
                productMap.set(
                    item.productId,
                    item.product
                );
            });
        });

        return Array.from(productMap.entries()).map(
            ([id, name]) => ({
                id,
                name,
            })
        );
    }, [stockIns]);

    const filteredRows = useMemo(() => {
        const rows: {
            stockInId: string;
            date: string;
            invoiceNumber: string;
            supplier: string;
            product: string;
            productId: string;
            batch: string;
            pack: string;
            quantity: number;
            rate: number;
            amount: number;
        }[] = [];

        stockIns.forEach((stockIn) => {
            stockIn.items.forEach((item) => {
                const monthMatches =
                    !selectedMonth ||
                    stockIn.invoiceDate.startsWith(
                        selectedMonth
                    );

                const productMatches =
                    !selectedProduct ||
                    item.productId === selectedProduct;

                if (
                    monthMatches &&
                    productMatches
                ) {
                    rows.push({
                        stockInId: stockIn.id,
                        date: stockIn.invoiceDate,
                        invoiceNumber:
                            stockIn.invoiceNumber,
                        supplier: stockIn.supplier,
                        product: item.product,
                        productId: item.productId,
                        batch: item.batch,
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
    ]);

    const totalQuantity = filteredRows.reduce(
        (total, row) => total + row.quantity,
        0
    );

    const totalAmount = filteredRows.reduce(
        (total, row) => total + row.amount,
        0
    );

    const clearFilters = () => {
        setSelectedMonth("");
        setSelectedProduct("");
    };

    return (
        <div className="min-h-screen bg-slate-50">

            {/* Header */}
            <div className="border-b border-green-100 bg-white px-6 py-5">
                <div className="flex items-center gap-4">

                    <Link
                        to="/stock-in"
                        className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>

                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Stock In History
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            View and filter previously received stock
                        </p>
                    </div>

                </div>
            </div>

            <main className="p-6">

                {/* Filters */}
                <section className="rounded-2xl border bg-white p-6 shadow-sm">

                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-green-50 p-3">
                            <Search className="h-5 w-5 text-green-600" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Filter Stock In
                            </h2>

                            <p className="text-sm text-slate-500">
                                Select month and product
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-3">

                        {/* Month */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Month
                            </label>

                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) =>
                                    setSelectedMonth(
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        {/* Product */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Product
                            </label>

                            <select
                                value={selectedProduct}
                                onChange={(e) =>
                                    setSelectedProduct(
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                                <option value="">
                                    All Products
                                </option>

                                {products.map((product, index) => (
                                    <option
                                        key={`${product.id}-${index}`}
                                        value={product.id}
                                    >
                                        {product.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clear */}
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Clear Filters
                            </button>
                        </div>

                    </div>

                </section>

                {/* Summary */}
                <section className="mt-6 grid gap-5 md:grid-cols-3">

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Stock In Entries
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-800">
                            {filteredRows.length}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Total Quantity
                        </p>

                        <p className="mt-2 text-2xl font-bold text-green-600">
                            {totalQuantity}
                        </p>
                    </div>

                    <div className="rounded-2xl border bg-white p-5 shadow-sm">
                        <p className="text-sm text-slate-500">
                            Total Purchase Amount
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-800">
                            ₹{totalAmount.toFixed(2)}
                        </p>
                    </div>

                </section>

                {/* Table */}
                <section className="mt-6 rounded-2xl border bg-white shadow-sm">

                    <div className="border-b p-6">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Stock In Details
                        </h2>
                    </div>

                    {loading ? (
                        <div className="p-8 text-center text-slate-500">
                            Loading Stock In history...
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No Stock In records found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="w-full min-w-[1100px] text-left text-sm">

                                <thead className="bg-slate-50">
                                    <tr className="border-b">

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Date
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Invoice
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Supplier
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Product
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Batch
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Pack
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Qty
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Rate
                                        </th>

                                        <th className="px-5 py-4 font-semibold text-slate-600">
                                            Amount
                                        </th>

                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredRows.map(
                                        (row, index) => (
                                            <tr
                                                key={`${row.stockInId}-${row.productId}-${row.batch}-${index}`}
                                                className="border-b last:border-b-0"
                                            >

                                                <td className="px-5 py-4 text-slate-600">
                                                    {row.date}
                                                </td>

                                                <td className="px-5 py-4 font-medium text-slate-700">
                                                    {row.invoiceNumber}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    {row.supplier}
                                                </td>

                                                <td className="px-5 py-4 font-medium text-slate-700">
                                                    {row.product}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    {row.batch}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    {row.pack}
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-slate-700">
                                                    {row.quantity}
                                                </td>

                                                <td className="px-5 py-4 text-slate-600">
                                                    ₹{row.rate.toFixed(2)}
                                                </td>

                                                <td className="px-5 py-4 font-semibold text-slate-700">
                                                    ₹{row.amount.toFixed(2)}
                                                </td>

                                            </tr>
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </section>

            </main>
        </div>
    );
}

export default StockInHistory;