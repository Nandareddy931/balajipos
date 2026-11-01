
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft, ArrowRight, Barcode, CheckCircle2, CreditCard, Minus, Package, Plus, Printer, Search, Share2,
    ShoppingCart, Wallet, Zap,
} from "lucide-react";

import { getProducts, type Product } from "../../services/productService";
import {
    generateBillNumber,
    saveBill,
    type BillItem,
    type PaymentStatus,
    type PaymentMode,
} from "../../services/billingService";

const money = (amount: number) =>
    `₹ ${amount.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;

interface CartItem extends BillItem {
    stockAvailable: number;
}

interface SavedReceipt {
    billNumber: string;
    customerName: string;
    customerPhone: string;
    billDate: string;
    items: BillItem[];
    total: number;
    paymentMode: PaymentMode;
    receivedAmount: number;
    changeAmount: number;
    totalQuantity: number;
}

const getToday = () => {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
    ].join("-");
};

export default function BillingMobile() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [step, setStep] = useState(1);
    const [search, setSearch] = useState("");

    const [customerPhone, setCustomerPhone] = useState("");
    const [customerName, setCustomerName] = useState("");

    const [paymentMode, setPaymentMode] =
        useState<PaymentMode>("Cash");
    const [receivedAmount, setReceivedAmount] = useState("");

    const [savedReceipt, setSavedReceipt] =
        useState<SavedReceipt | null>(null);

    const billDate = useMemo(() => getToday(), []);

    useEffect(() => {
        let active = true;

        const loadProducts = async () => {
            try {
                const result = await getProducts();

                if (active) {
                    setProducts(
                        result.filter((product) => product.active)
                    );
                }
            } catch (error) {
                console.error("Unable to load products:", error);
                if (active) {
                    alert("Unable to load products. Please try again.");
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void loadProducts();

        return () => {
            active = false;
        };
    }, []);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return [];

        return products.filter((product) =>
            product.name.toLowerCase().includes(term) ||
            product.category.toLowerCase().includes(term) ||
            (product.manufacturer ?? "").toLowerCase().includes(term)
        );
    }, [products, search]);

    const subtotal = useMemo(
        () => cart.reduce((total, item) => total + item.amount, 0),
        [cart]
    );

    const totalQuantity = useMemo(
        () => cart.reduce((total, item) => total + item.quantity, 0),
        [cart]
    );

    const cashReceived =
        paymentMode === "Cash"
            ? Number(receivedAmount || 0)
            : subtotal;

    const changeAmount =
        paymentMode === "Cash"
            ? Math.max(0, cashReceived - subtotal)
            : 0;

    const addToCart = (product: Product) => {
        if (product.currentStock <= 0) {
            alert(`${product.name} is out of stock.`);
            return;
        }

        setCart((current) => {
            const existing = current.find(
                (item) => item.productId === product.id
            );

            if (existing) {
                if (existing.quantity >= product.currentStock) {
                    alert(
                        `Only ${product.currentStock} units are available.`
                    );
                    return current;
                }

                return current.map((item) =>
                    item.productId === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1,
                            amount:
                                (item.quantity + 1) * item.sellingPrice,
                        }
                        : item
                );
            }

            return [
                ...current,
                {
                    productId: product.id,
                    productName: product.name,
                    quantity: 1,
                    unit: product.unit,
                    sellingPrice: product.sellingPrice,
                    amount: product.sellingPrice,
                    stockAvailable: product.currentStock,
                },
            ];
        });
        setSearch("");
    };

    const changeQuantity = (
        productId: string,
        change: number
    ) => {
        setCart((current) =>
            current
                .map((item) => {
                    if (item.productId !== productId) return item;

                    const quantity = item.quantity + change;

                    if (quantity > item.stockAvailable) {
                        alert(
                            `Only ${item.stockAvailable} units are available.`
                        );
                        return item;
                    }

                    return {
                        ...item,
                        quantity,
                        amount: quantity * item.sellingPrice,
                    };
                })
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (productId: string) => {
        setCart((current) =>
            current.filter((item) => item.productId !== productId)
        );
    };

    const continueToProducts = () => {
        const phone = customerPhone.replace(/\D/g, "");

        if (!/^[6-9]\d{9}$/.test(phone)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        setCustomerPhone(phone);
        setStep(2);
    };

    const continueToPayment = () => {
        if (cart.length === 0) {
            alert("Please add at least one product.");
            return;
        }

        setStep(3);
    };

    const completeBill = async () => {
        if (saving) return;

        if (!/^[6-9]\d{9}$/.test(customerPhone)) {
            alert("Please enter a valid customer mobile number.");
            setStep(1);
            return;
        }

        if (cart.length === 0) {
            alert("Please add at least one product.");
            setStep(2);
            return;
        }

        if (
            paymentMode === "Cash" &&
            (!Number.isFinite(Number(receivedAmount)) ||
                Number(receivedAmount) < subtotal)
        ) {
            alert("Cash received must cover the bill total.");
            return;
        }

        try {
            setSaving(true);

            const billNumber = generateBillNumber();

            const billItems: BillItem[] = cart.map(
                ({
                    productId,
                    productName,
                    quantity,
                    unit,
                    sellingPrice,
                    amount,
                }) => ({
                    productId,
                    productName,
                    quantity,
                    unit,
                    sellingPrice,
                    amount,
                })
            );

            const finalStatus: PaymentStatus = "Paid";

            // saveBill performs the stock deduction and movement
            // recording. Do NOT call deductStockForBill again.
            await saveBill({
                billNumber,
                customerName:
                    customerName.trim() || "Walk-in Customer",
                customerPhone,
                billDate,
                items: billItems,
                subtotal,
                grandTotal: subtotal,
                paidAmount: subtotal,
                paymentStatus: finalStatus,
                paymentMode,
            });

            const receipt: SavedReceipt = {
                billNumber,
                customerName:
                    customerName.trim() || "Walk-in Customer",
                customerPhone,
                billDate,
                items: billItems,
                total: subtotal,
                paymentMode,
                receivedAmount: cashReceived,
                changeAmount,
                totalQuantity,
            };

            setSavedReceipt(receipt);
            setStep(3);

            // Refresh stock after successful sale.
            const refreshedProducts = await getProducts();
            setProducts(
                refreshedProducts.filter((product) => product.active)
            );

        } catch (error) {
            console.error("Error completing bill:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to complete the bill. Check your bills and stock before retrying."
            );
        } finally {
            setSaving(false);
        }
    };

    const shareReceipt = async () => {
        if (!savedReceipt) return;

        const text = [
            "BALAJI STOCK",
            `Bill No: ${savedReceipt.billNumber}`,
            `Date: ${savedReceipt.billDate}`,
            `Customer: ${savedReceipt.customerName}`,
            `Mobile: ${savedReceipt.customerPhone}`,
            ...savedReceipt.items.map(
                (item) =>
                    `${item.productName} x ${item.quantity} = ${money(item.amount)}`
            ),
            `Total: ${money(savedReceipt.total)}`,
            `Payment: ${savedReceipt.paymentMode}`,
        ].join("\n");

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "Bill Receipt",
                    text,
                });
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.name !== "AbortError"
                ) {
                    console.error("Unable to share receipt:", error);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(text);
                alert("Receipt copied. You can share it through WhatsApp.");
            } catch {
                alert(text);
            }
        }
    };

    const createNewBill = () => {
        setCart([]);
        setSearch("");
        setCustomerPhone("");
        setCustomerName("");
        setPaymentMode("Cash");
        setReceivedAmount("");
        setSavedReceipt(null);
        setStep(1);
    };

    const header = (
        <header className="sticky top-0 z-30 bg-[#087653] px-4 py-3 text-white shadow-md">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    <ShoppingCart size={21} />
                </div>

                <div className="min-w-0 flex-1">
                    <h1 className="text-base font-extrabold">
                        Retail POS
                    </h1>
                    <p className="text-xs text-green-100">
                        Fast checkout
                    </p>
                </div>

                <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold">
                    {savedReceipt ? "Completed" : `Step ${step} of 3`}
                </span>
            </div>
        </header>
    );

    const stepIndicator = (
        <div className="grid grid-cols-3 gap-2">
            {[
                { number: 1, title: "Customer" },
                { number: 2, title: "Products" },
                { number: 3, title: "Payment" },
            ].map((item) => (
                <div
                    key={item.number}
                    className={`rounded-xl px-2 py-2.5 text-center text-xs font-bold ${step >= item.number
                        ? "bg-[#087653] text-white"
                        : "bg-white text-slate-400"
                        }`}
                >
                    <span className="mr-1">
                        {step > item.number ? "✓" : item.number}
                    </span>
                    {item.title}
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f4f6f8] pb-8 text-slate-800">
            {header}

            <main className="mx-auto max-w-xl space-y-4 p-3 pb-8">
                {!savedReceipt && stepIndicator}

                {/* STEP 1: CUSTOMER MOBILE NUMBER */}
                {step === 1 && (
                    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-[#087653]">
                                Step 1 · Customer
                            </p>
                            <h2 className="mt-2 text-2xl font-extrabold">
                                Customer details
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Enter the customer's mobile number to start billing.
                            </p>
                        </div>

                        <label className="block text-sm font-bold">
                            Mobile number
                            <div className="mt-2 flex items-center rounded-xl border border-slate-300 px-3 focus-within:border-[#087653] focus-within:ring-2 focus-within:ring-emerald-100">
                                <span className="border-r border-slate-200 pr-3 text-sm font-bold">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    value={customerPhone}
                                    onChange={(e) =>
                                        setCustomerPhone(
                                            e.target.value
                                                .replace(/\D/g, "")
                                                .slice(0, 10)
                                        )
                                    }
                                    placeholder="Enter 10-digit mobile number"
                                    className="w-full bg-transparent px-3 py-4 text-lg font-semibold outline-none"
                                    autoFocus
                                />
                            </div>
                        </label>


                        <button
                            type="button"
                            onClick={continueToProducts}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087653] px-4 py-4 font-extrabold text-white"
                        >
                            Continue to products
                            <ArrowRight size={19} />
                        </button>
                    </section>
                )}

                {/* STEP 2: SUPERMARKET PRODUCT BILLING */}
                {step === 2 && !savedReceipt && (
                    <>
                        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-[#087653]">
                                        Step 2 · Products
                                    </p>
                                    <h2 className="mt-1 text-xl font-extrabold">
                                        Add products
                                    </h2>
                                </div>

                                <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-bold text-[#087653]">
                                    {totalQuantity} units
                                </span>
                            </div>

                            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-3.5 focus-within:border-[#087653]">
                                <Search size={21} className="text-slate-500" />

                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search product name..."
                                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                                />

                                <Barcode size={22} className="text-[#087653]" />
                            </div>

                            {search.trim() && (
                                <p className="mt-2 text-xs text-slate-500">
                                    {filteredProducts.length} matching products
                                </p>
                            )}
                        </section>

                        {/* Search results */}
                        {search.trim() && (
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {loading ? (
                                    <p className="p-6 text-center text-sm text-slate-500">
                                        Loading products...
                                    </p>
                                ) : filteredProducts.length === 0 ? (
                                    <p className="p-6 text-center text-sm text-slate-500">
                                        No matching products found.
                                    </p>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {filteredProducts.map((product) => {
                                            const item = cart.find(
                                                (entry) => entry.productId === product.id
                                            );

                                            const outOfStock = product.currentStock <= 0;

                                            return (
                                                <div
                                                    key={product.id}
                                                    className="flex items-center gap-3 p-3"
                                                >
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[#087653]">
                                                        <Package size={22} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 text-sm font-bold">
                                                            {product.name}
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-500">
                                                            {product.category} · Stock: {product.currentStock}
                                                        </p>

                                                        <p className="mt-1 font-extrabold text-[#087653]">
                                                            {money(product.sellingPrice)}
                                                            <span className="ml-1 text-xs font-normal text-slate-500">
                                                                / {product.unit}
                                                            </span>
                                                        </p>
                                                    </div>

                                                    {item ? (
                                                        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-2 py-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => changeQuantity(product.id, -1)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#087653]"
                                                            >
                                                                <Minus size={16} />
                                                            </button>

                                                            <span className="min-w-5 text-center font-extrabold">
                                                                {item.quantity}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                disabled={item.quantity >= product.currentStock}
                                                                onClick={() => addToCart(product)}
                                                                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#087653] disabled:opacity-30"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            disabled={outOfStock}
                                                            onClick={() => addToCart(product)}
                                                            className="rounded-xl bg-[#087653] px-4 py-2.5 text-sm font-bold text-white disabled:bg-slate-300"
                                                        >
                                                            Add
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* Cart */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 p-4">
                                <h3 className="flex items-center gap-2 font-extrabold">
                                    <ShoppingCart size={19} className="text-[#087653]" />
                                    Current bill
                                </h3>
                                <span className="text-xs font-bold text-slate-500">
                                    {cart.length} products
                                </span>
                            </div>

                            {cart.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ShoppingCart
                                        size={34}
                                        className="mx-auto text-slate-300"
                                    />
                                    <p className="mt-3 font-bold text-slate-600">
                                        Your cart is empty
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Search and add products above.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {cart.map((item) => (
                                        <div
                                            key={item.productId}
                                            className="flex items-center gap-2 p-3"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold">
                                                    {item.productName}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {money(item.sellingPrice)} / {item.unit}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        changeQuantity(item.productId, -1)
                                                    }
                                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white"
                                                >
                                                    <Minus size={14} />
                                                </button>

                                                <span className="min-w-5 text-center text-sm font-bold">
                                                    {item.quantity}
                                                </span>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        item.quantity >= item.stockAvailable
                                                    }
                                                    onClick={() => {
                                                        const product = products.find(
                                                            (p) => p.id === item.productId
                                                        );
                                                        if (product) addToCart(product);
                                                    }}
                                                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white disabled:opacity-30"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>

                                            <div className="min-w-[75px] text-right">
                                                <p className="text-sm font-extrabold">
                                                    {money(item.amount)}
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeItem(item.productId)
                                                    }
                                                    className="mt-1 text-xs font-semibold text-red-500"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-slate-100 bg-slate-50 p-4">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Total quantity</span>
                                    <span>{totalQuantity}</span>
                                </div>
                                <div className="mt-2 flex justify-between text-lg font-extrabold">
                                    <span>Grand total</span>
                                    <span className="text-[#087653]">
                                        {money(subtotal)}
                                    </span>
                                </div>
                            </div>
                        </section>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 font-bold"
                            >
                                <ArrowLeft size={18} />
                                Back
                            </button>

                            <button
                                type="button"
                                disabled={!cart.length}
                                onClick={continueToPayment}
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#087653] py-3.5 font-extrabold text-white disabled:bg-slate-300"
                            >
                                Payment
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </>
                )}

                {/* STEP 3: PAYMENT */}
                {step === 3 && !savedReceipt && (
                    <section className="space-y-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-[#087653]">
                                Step 3 · Checkout
                            </p>
                            <h2 className="mt-1 text-xl font-extrabold">
                                Payment
                            </h2>

                            <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                                <p className="text-sm font-semibold text-slate-600">
                                    Amount to collect
                                </p>
                                <p className="mt-1 text-3xl font-extrabold text-[#087653]">
                                    {money(subtotal)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {totalQuantity} units · {cart.length} products
                                </p>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                                {([
                                    { name: "Cash" as const, icon: Wallet },
                                    { name: "UPI" as const, icon: Zap },
                                    { name: "Card" as const, icon: CreditCard },
                                ]).map(({ name, icon: Icon }) => (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => setPaymentMode(name)}
                                        className={`flex flex-col items-center gap-2 rounded-xl border py-4 text-sm font-extrabold ${paymentMode === name
                                            ? "border-[#087653] bg-[#087653] text-white"
                                            : "border-slate-200 bg-white text-slate-700"
                                            }`}
                                    >
                                        <Icon size={23} />
                                        {name}
                                    </button>
                                ))}
                            </div>

                            {paymentMode === "Cash" && (
                                <label className="mt-4 block text-sm font-bold">
                                    Cash received
                                    <input
                                        type="number"
                                        min={subtotal}
                                        step="0.01"
                                        inputMode="decimal"
                                        value={receivedAmount}
                                        onChange={(e) =>
                                            setReceivedAmount(e.target.value)
                                        }
                                        placeholder={`Enter at least ${subtotal}`}
                                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-4 text-lg outline-none focus:border-[#087653]"
                                    />

                                    <span className="mt-3 flex justify-between text-sm">
                                        <span className="text-slate-500">
                                            Change to return
                                        </span>
                                        <span className="font-extrabold text-[#087653]">
                                            {money(changeAmount)}
                                        </span>
                                    </span>
                                </label>
                            )}
                        </div>

                        {/* Final bill review */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="font-extrabold">
                                Final bill summary
                            </h3>

                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">
                                        Customer
                                    </span>
                                    <span className="font-semibold">
                                        {customerName.trim() || "Walk-in Customer"}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">
                                        Mobile
                                    </span>
                                    <span className="font-semibold">
                                        +91 {customerPhone}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">
                                        Products
                                    </span>
                                    <span className="font-semibold">
                                        {cart.length}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-slate-500">
                                        Payment
                                    </span>
                                    <span className="font-semibold">
                                        {paymentMode}
                                    </span>
                                </div>

                                <div className="flex justify-between border-t border-dashed border-slate-200 pt-3 text-lg font-extrabold">
                                    <span>Total</span>
                                    <span className="text-[#087653]">
                                        {money(subtotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 font-bold"
                            >
                                <ArrowLeft size={18} />
                                Edit cart
                            </button>

                            <button
                                type="button"
                                disabled={saving || !cart.length}
                                onClick={() => void completeBill()}
                                className="flex items-center justify-center gap-2 rounded-xl bg-[#087653] py-3.5 font-extrabold text-white shadow-sm disabled:bg-slate-300"
                            >
                                <CheckCircle2 size={19} />
                                {saving ? "Saving..." : "Complete sale"}
                            </button>
                        </div>
                    </section>
                )}

                {/* SAVED RECEIPT */}
                {savedReceipt && (
                    <section className="space-y-4">
                        <div
                            id="saved-bill-receipt"
                            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="bg-[#087653] p-5 text-center text-white">
                                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                                    <CheckCircle2 size={29} />
                                </div>
                                <h2 className="text-xl font-extrabold">
                                    Sale completed
                                </h2>
                                <p className="mt-1 text-sm text-green-100">
                                    Payment recorded successfully
                                </p>
                                <p className="mt-3 text-sm font-bold">
                                    Bill No: {savedReceipt.billNumber}
                                </p>
                            </div>

                            <div className="space-y-3 p-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Date</span>
                                    <span className="font-semibold">
                                        {savedReceipt.billDate}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Customer</span>
                                    <span className="font-semibold">
                                        {savedReceipt.customerName}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mobile</span>
                                    <span className="font-semibold">
                                        {savedReceipt.customerPhone}
                                    </span>
                                </div>

                                <div className="border-t border-dashed border-slate-200 pt-3">
                                    {savedReceipt.items.map((item) => (
                                        <div
                                            key={item.productId}
                                            className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"
                                        >
                                            <div>
                                                <p className="font-semibold">
                                                    {item.productName}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {item.quantity} {item.unit} × {money(item.sellingPrice)}
                                                </p>
                                            </div>
                                            <span className="font-bold">
                                                {money(item.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2 border-t border-dashed border-slate-300 pt-3 text-sm">
                                    <div className="flex justify-between">
                                        <span>Quantity</span>
                                        <span>{savedReceipt.totalQuantity}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span>Payment method</span>
                                        <span className="font-bold">
                                            {savedReceipt.paymentMode}
                                        </span>
                                    </div>

                                    {savedReceipt.paymentMode === "Cash" && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Cash received</span>
                                                <span>
                                                    {money(savedReceipt.receivedAmount)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Change returned</span>
                                                <span>
                                                    {money(savedReceipt.changeAmount)}
                                                </span>
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-between border-t border-slate-200 pt-3 text-xl font-extrabold text-[#087653]">
                                        <span>Grand total</span>
                                        <span>
                                            {money(savedReceipt.total)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                                Thank you for your business!
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#087653] py-4 font-extrabold text-white"
                        >
                            <Printer size={20} />
                            Print receipt
                        </button>

                        <button
                            type="button"
                            onClick={() => void shareReceipt()}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3.5 font-bold text-[#087653]"
                        >
                            <Share2 size={19} />
                            Share bill
                        </button>

                        <button
                            type="button"
                            onClick={createNewBill}
                            className="w-full rounded-xl border border-slate-300 bg-white py-3.5 font-bold"
                        >
                            + Create new bill
                        </button>
                    </section>
                )}

                <p className="px-2 text-center text-xs text-slate-400">
                    Tax and discount are not included in this bill.
                </p>
            </main>
        </div>
    );
}
