import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
    ArrowRight,
    Check,
    CreditCard,
    Filter,
    Minus,
    Package,
    Phone,
    Plus,
    Printer,
    Receipt,
    Save,
    Search,
    Share2,
    Trash2,
    User,
    Wallet,
    X,
    Zap,
} from "lucide-react";

import {
    getProducts,
    type Product,
} from "../services/productService";

import {
    saveBill,
    generateBillNumber,
    type BillItem,
    type PaymentStatus,
} from "../services/billingService";

import { deductStockForBill } from "../services/stockService";


// ============================================================
// TYPES
// ============================================================

interface CartItem extends BillItem {
    stockAvailable: number;
}

interface PrintBillData {
    billNumber: string;
    customerName: string;
    customerPhone: string;
    billDate: string;
    items: BillItem[];
    subtotal: number;
    grandTotal: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
}

type PaymentMode = "Cash" | "UPI" | "Card" | "Other";


// ============================================================
// CONSTANTS
// ============================================================

const CATEGORIES = [
    "All",
    "Pesticide",
    "Insecticide",
    "Fungicide",
    "Herbicide",
    "Fertilizer",
    "Seed",
];


// ============================================================
// BILLING COMPONENT
// ============================================================

function Billing() {

    // ============================================================
    // PRODUCTS
    // ============================================================

    const [products, setProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(true);


    // ============================================================
    // BILL
    // ============================================================

    const [savingBill, setSavingBill] = useState(false);

    const [billNumber, setBillNumber] = useState("");

    const [customerName, setCustomerName] = useState("");

    const [customerPhone, setCustomerPhone] = useState("");

    const [billDate, setBillDate] = useState(
        new Date().toISOString().split("T")[0]
    );

    const [cart, setCart] = useState<CartItem[]>([]);


    // ============================================================
    // PRODUCT SEARCH
    // ============================================================

    const [productSearch, setProductSearch] = useState("");

    const [selectedCategory, setSelectedCategory] =
        useState("All");

    const [selectedProductId, setSelectedProductId] =
        useState("");

    const [quantity, setQuantity] = useState(1);


    // ============================================================
    // PAYMENT
    // ============================================================

    const [paidAmount, setPaidAmount] = useState(0);

    const [paymentStatus, setPaymentStatus] =
        useState<PaymentStatus>("Paid");

    const [paymentMode, setPaymentMode] =
        useState<PaymentMode>("Cash");


    // ============================================================
    // PRINT
    // ============================================================

    const [printBill, setPrintBill] =
        useState<PrintBillData | null>(null);


    // ============================================================
    // LOAD PRODUCTS
    // ============================================================

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoadingProducts(true);

                const loadedProducts = await getProducts();

                setProducts(
                    loadedProducts.filter(
                        (product) => product.active
                    )
                );
            } catch (error) {
                console.error(
                    "Failed to load products:",
                    error
                );

                alert("Unable to load products.");
            } finally {
                setLoadingProducts(false);
            }
        };

        void loadProducts();
    }, []);


    // ============================================================
    // BILL NUMBER
    // ============================================================

    useEffect(() => {
        setBillNumber(generateBillNumber());
    }, []);


    // ============================================================
    // FILTER PRODUCTS
    // ============================================================

    const filteredProducts = useMemo(() => {
        const search = productSearch
            .trim()
            .toLowerCase();

        return products.filter((product) => {

            const matchesSearch =
                !search ||
                product.name
                    .toLowerCase()
                    .includes(search) ||
                product.category
                    .toLowerCase()
                    .includes(search) ||
                product.manufacturer || ""
                    .toLowerCase()
                    .includes(search);

            const matchesCategory =
                selectedCategory === "All" ||
                product.category === selectedCategory;

            return (
                matchesSearch &&
                matchesCategory
            );
        });
    }, [
        products,
        productSearch,
        selectedCategory,
    ]);


    // ============================================================
    // SELECTED PRODUCT
    // ============================================================

    const selectedProduct = products.find(
        (product) =>
            product.id === selectedProductId
    );


    // ============================================================
    // SELECT PRODUCT
    // ============================================================

    const selectProduct = (
        product: Product
    ) => {
        setSelectedProductId(product.id);
        setProductSearch(product.name);
        setQuantity(1);
    };


    // ============================================================
    // ADD PRODUCT TO CART
    // ============================================================

    const addItemToCart = () => {

        if (!selectedProduct) {
            alert("Please select a product.");
            return;
        }

        if (
            !Number.isFinite(quantity) ||
            quantity <= 0
        ) {
            alert("Please enter a valid quantity.");
            return;
        }

        if (
            selectedProduct.currentStock <= 0
        ) {
            alert(
                `${selectedProduct.name} is out of stock.`
            );

            return;
        }

        if (
            quantity >
            selectedProduct.currentStock
        ) {
            alert(
                `Only ${selectedProduct.currentStock} available in stock.`
            );

            return;
        }

        const existingItem = cart.find(
            (item) =>
                item.productId ===
                selectedProduct.id
        );

        if (existingItem) {

            const newQuantity =
                existingItem.quantity +
                quantity;

            if (
                newQuantity >
                selectedProduct.currentStock
            ) {
                alert(
                    `Only ${selectedProduct.currentStock} available in stock.`
                );

                return;
            }

            setCart((currentCart) =>
                currentCart.map((item) =>
                    item.productId ===
                        selectedProduct.id
                        ? {
                            ...item,
                            quantity:
                                newQuantity,
                            amount:
                                newQuantity *
                                item.sellingPrice,
                        }
                        : item
                )
            );

        } else {

            const newItem: CartItem = {
                productId:
                    selectedProduct.id,

                productName:
                    selectedProduct.name,

                unit:
                    selectedProduct.unit,

                quantity,

                sellingPrice:
                    selectedProduct.sellingPrice,

                amount:
                    quantity *
                    selectedProduct.sellingPrice,

                stockAvailable:
                    selectedProduct.currentStock,
            };

            setCart((currentCart) => [
                ...currentCart,
                newItem,
            ]);
        }

        setSelectedProductId("");
        setProductSearch("");
        setQuantity(1);
    };


    // ============================================================
    // REMOVE ITEM
    // ============================================================

    const removeItem = (
        productId: string
    ) => {
        setCart((currentCart) =>
            currentCart.filter(
                (item) =>
                    item.productId !==
                    productId
            )
        );
    };


    // ============================================================
    // UPDATE QUANTITY
    // ============================================================

    const updateQuantity = (
        productId: string,
        newQuantity: number
    ) => {

        if (
            !Number.isFinite(newQuantity) ||
            newQuantity < 1
        ) {
            return;
        }

        setCart((currentCart) =>
            currentCart.map((item) => {

                if (
                    item.productId !==
                    productId
                ) {
                    return item;
                }

                if (
                    newQuantity >
                    item.stockAvailable
                ) {
                    alert(
                        `Only ${item.stockAvailable} ${item.unit} available.`
                    );

                    return item;
                }

                return {
                    ...item,
                    quantity:
                        newQuantity,
                    amount:
                        newQuantity *
                        item.sellingPrice,
                };
            })
        );
    };


    // ============================================================
    // TOTALS
    // ============================================================

    const subtotal = useMemo(() => {
        return cart.reduce(
            (total, item) =>
                total + item.amount,
            0
        );
    }, [cart]);

    const grandTotal = subtotal;

    const outstanding = Math.max(
        0,
        grandTotal - paidAmount
    );


    // ============================================================
    // PAYMENT STATUS
    // ============================================================

    useEffect(() => {

        if (
            paidAmount >= grandTotal &&
            grandTotal > 0
        ) {
            setPaymentStatus("Paid");

        } else if (
            paidAmount > 0
        ) {
            setPaymentStatus("Partial");

        } else if (
            grandTotal > 0
        ) {
            setPaymentStatus("Credit");

        } else {
            setPaymentStatus("Paid");
        }

    }, [
        paidAmount,
        grandTotal,
    ]);


    // ============================================================
    // INTERNAL SAVE BILL FUNCTION
    // ============================================================

    const saveBillInternal = async (
        forceFullPayment = false
    ) => {

        // Prevent duplicate saves
        if (savingBill) {
            return;
        }


        // --------------------------------------------------------
        // FINAL PAYMENT VALUES
        // --------------------------------------------------------

        const finalPaidAmount =
            forceFullPayment
                ? grandTotal
                : paidAmount;

        const finalPaymentStatus: PaymentStatus =
            forceFullPayment
                ? "Paid"
                : paymentStatus;


        // --------------------------------------------------------
        // VALIDATION
        // --------------------------------------------------------

        if (!customerName.trim()) {
            alert(
                "Please enter customer name."
            );

            return;
        }

        if (!customerPhone.trim()) {
            alert(
                "Please enter customer phone number."
            );

            return;
        }

        if (!billDate) {
            alert(
                "Please select bill date."
            );

            return;
        }

        if (cart.length === 0) {
            alert(
                "Please add at least one product."
            );

            return;
        }

        if (finalPaidAmount < 0) {
            alert(
                "Paid amount cannot be negative."
            );

            return;
        }

        if (
            finalPaidAmount >
            grandTotal
        ) {
            alert(
                "Paid amount cannot be greater than grand total."
            );

            return;
        }


        // --------------------------------------------------------
        // SAVE
        // --------------------------------------------------------

        try {

            setSavingBill(true);


            // Generate new bill number
            const newBillNumber =
                generateBillNumber();


            // Prepare bill items
            const billItems: BillItem[] =
                cart.map((item) => ({
                    productId:
                        item.productId,

                    productName:
                        item.productName,

                    quantity:
                        item.quantity,

                    unit:
                        item.unit,

                    sellingPrice:
                        item.sellingPrice,

                    amount:
                        item.amount,
                }));


            // Create bill
            const bill = {
                billNumber:
                    newBillNumber,

                customerName:
                    customerName.trim(),

                customerPhone:
                    customerPhone.trim(),

                billDate,

                items:
                    billItems,

                subtotal,

                grandTotal,

                paidAmount:
                    finalPaidAmount,

                paymentStatus:
                    finalPaymentStatus,
                paymentMode: paymentMode,
            };


            // Save bill to Firestore
            const billId =
                await saveBill(bill);

            console.log(
                "Bill saved successfully:",
                billId
            );


            // ----------------------------------------------------
            // DEDUCT STOCK
            // ----------------------------------------------------

            await deductStockForBill(
                billId,
                newBillNumber,
                cart.map((item) => ({
                    productId:
                        item.productId,

                    productName:
                        item.productName,

                    quantity:
                        item.quantity,
                }))
            );

            console.log(
                "Stock deducted successfully."
            );


            // ----------------------------------------------------
            // PREPARE PRINT BILL
            // ----------------------------------------------------

            setPrintBill({
                billNumber:
                    newBillNumber,

                customerName:
                    customerName.trim(),

                customerPhone:
                    customerPhone.trim(),

                billDate,

                items:
                    billItems,

                subtotal,

                grandTotal,

                paidAmount:
                    finalPaidAmount,

                paymentStatus:
                    finalPaymentStatus,
            });

        } catch (error) {

            console.error(
                "Error saving bill:",
                error
            );

            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to save bill.";

            alert(message);

        } finally {

            setSavingBill(false);
        }
    };


    // ============================================================
    // NORMAL SAVE BILL
    // ============================================================

    const handleSaveBill = async () => {
        await saveBillInternal(false);
    };


    // ============================================================
    // F8 - FULLY PAID SALE
    // ============================================================

    const handleSaveBillAsPaid = async () => {
        await saveBillInternal(true);
    };


    // ============================================================
    // F8 KEYBOARD SHORTCUT
    // ============================================================

    useEffect(() => {

        const handleKeyboardShortcut = (
            event: KeyboardEvent
        ) => {

            // Only F8
            if (event.key !== "F8") {
                return;
            }


            // Prevent browser/default action
            event.preventDefault();


            // Prevent duplicate save
            if (savingBill) {
                return;
            }


            // Cart must contain products
            if (cart.length === 0) {

                alert(
                    "Please add at least one product."
                );

                return;
            }


            // F8 = fully paid sale
            void handleSaveBillAsPaid();
        };


        window.addEventListener(
            "keydown",
            handleKeyboardShortcut
        );


        return () => {

            window.removeEventListener(
                "keydown",
                handleKeyboardShortcut
            );

        };

    }, [
        savingBill,
        cart.length,
        grandTotal,
        paidAmount,
        paymentStatus,
        customerName,
        customerPhone,
        billDate,
    ]);


    // ============================================================
    // PRINT AFTER SAVE
    // ============================================================

    useEffect(() => {

        if (!printBill) {
            return;
        }


        const timer =
            window.setTimeout(() => {

                // Open browser print dialog
                window.print();


                // Clear print data
                setPrintBill(null);


                // Generate next bill number
                setBillNumber(
                    generateBillNumber()
                );


                // Reset customer
                setCustomerName("");
                setCustomerPhone("");


                // Reset cart
                setCart([]);


                // Reset product selection
                setSelectedProductId("");
                setProductSearch("");
                setQuantity(1);


                // Reset payment
                setPaidAmount(0);
                setPaymentStatus("Credit");
                setPaymentMode("Cash");


                // Reset date
                setBillDate(
                    new Date()
                        .toISOString()
                        .split("T")[0]
                );

            }, 100);


        return () => {
            window.clearTimeout(timer);
        };

    }, [printBill]);


    // ============================================================
    // DATE DISPLAY
    // ============================================================

    const formattedDate =
        new Date(
            `${billDate}T00:00:00`
        ).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            }
        );


    // ============================================================
    // WHATSAPP
    // ============================================================

    const handleWhatsApp = () => {

        if (!customerPhone.trim()) {

            alert(
                "Please enter customer phone number."
            );

            return;
        }

        if (cart.length === 0) {

            alert(
                "Please add at least one product."
            );

            return;
        }


        const itemsText =
            cart
                .map(
                    (item, index) =>
                        `${index + 1}. ${item.productName
                        } - ${item.quantity
                        } ${item.unit
                        } × ₹${item.sellingPrice.toFixed(
                            2
                        )} = ₹${item.amount.toFixed(
                            2
                        )}`
                )
                .join("\n");


        const message = `New Balaji Ruthu Depo

Bill No: ${billNumber}
Date: ${formattedDate}

Customer: ${customerName || "-"}
Phone: ${customerPhone}

Items:
${itemsText}

Subtotal: ₹${subtotal.toFixed(2)}
Grand Total: ₹${grandTotal.toFixed(2)}
Paid: ₹${paidAmount.toFixed(2)}
Outstanding: ₹${outstanding.toFixed(2)}
Payment Status: ${paymentStatus}

Thank you for your business.`;


        const encoded =
            encodeURIComponent(message);


        window.open(
            `https://wa.me/?text=${encoded}`,
            "_blank"
        );
    };


    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="min-h-screen bg-slate-50">

            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <header className="border-b border-slate-200 bg-white px-4 py-4 md:px-6">

                <div className="flex items-center justify-between gap-4">

                    <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">

                            <Receipt className="h-6 w-6 text-green-700" />

                        </div>

                        <div>

                            <h1 className="text-xl font-bold text-slate-800">
                                Create New Bill
                            </h1>

                            <p className="text-sm text-slate-500">
                                Add customer details, select products and complete the sale
                            </p>

                        </div>

                    </div>


                    <button
                        type="button"
                        className="hidden items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 md:flex"
                    >
                        <Zap className="h-4 w-4" />
                        Quick Actions
                    </button>

                </div>

            </header>


            {/* ==================================================
                MAIN BILLING LAYOUT
            ================================================== */}

            <main className="p-4 md:p-6">

                <div className="mx-auto grid max-w-[1500px] gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(380px,0.9fr)]">


                    {/* ==================================================
                        LEFT SIDE
                    ================================================== */}

                    <div className="space-y-5">


                        {/* ==================================================
                            CUSTOMER DETAILS
                        ================================================== */}

                        <section className="rounded-2xl border border-green-100 bg-white shadow-sm">

                            <div className="border-b border-green-100 bg-green-50/60 p-5">

                                <div className="flex items-center justify-between gap-3">

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">

                                            <User className="h-5 w-5 text-green-700" />

                                        </div>

                                        <div>

                                            <h2 className="font-semibold text-green-900">
                                                Customer Details
                                            </h2>

                                            <p className="text-xs text-green-700">
                                                Enter customer information
                                            </p>

                                        </div>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCustomerName("");
                                            setCustomerPhone("");
                                        }}
                                        className="hidden rounded-lg border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 sm:block"
                                    >
                                        + New Customer
                                    </button>

                                </div>

                            </div>


                            <div className="grid gap-4 p-5 md:grid-cols-2">

                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">

                                        Customer Name

                                        <span className="text-red-500">
                                            {" "}*
                                        </span>

                                    </label>


                                    <input
                                        value={customerName}
                                        onChange={(e) =>
                                            setCustomerName(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter customer name"
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                    />

                                </div>


                                <div>

                                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                        Phone Number
                                    </label>


                                    <div className="relative">

                                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />


                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) =>
                                                setCustomerPhone(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter phone number"
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        />

                                    </div>

                                </div>

                            </div>

                        </section>


                        {/* ==================================================
                            PRODUCT SEARCH
                        ================================================== */}

                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                            <div className="grid gap-3 md:grid-cols-[1fr_155px]">


                                <div className="relative">

                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />


                                    <input
                                        value={productSearch}
                                        onChange={(e) =>
                                            setProductSearch(
                                                e.target.value
                                            )
                                        }
                                        placeholder={
                                            loadingProducts
                                                ? "Loading products..."
                                                : "Search product by name..."
                                        }
                                        disabled={loadingProducts}
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                    />


                                    {productSearch && (

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProductSearch("");
                                                setSelectedProductId("");
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>

                                    )}

                                </div>


                                <button
                                    type="button"
                                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                >
                                    <Filter className="h-4 w-4" />
                                    {selectedCategory}
                                </button>

                            </div>


                            {/* CATEGORY FILTERS */}

                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">

                                {CATEGORIES.map(
                                    (category) => (

                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() =>
                                                setSelectedCategory(
                                                    category
                                                )
                                            }
                                            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${selectedCategory ===
                                                category
                                                ? "bg-green-700 text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700"
                                                }`}
                                        >
                                            {category}
                                        </button>

                                    )
                                )}

                            </div>


                            {/* PRODUCT LIST */}

                            <div className="mt-4 max-h-[430px] overflow-y-auto rounded-xl border border-slate-100">

                                {loadingProducts ? (

                                    <div className="p-10 text-center text-sm text-slate-500">
                                        Loading products...
                                    </div>

                                ) : filteredProducts.length === 0 ? (

                                    <div className="p-10 text-center">

                                        <Package className="mx-auto h-8 w-8 text-slate-300" />

                                        <p className="mt-2 text-sm font-medium text-slate-600">
                                            No products found
                                        </p>

                                    </div>

                                ) : (

                                    filteredProducts.map(
                                        (product) => (

                                            <div
                                                key={
                                                    product.id
                                                }
                                                className={`flex items-center gap-3 border-b border-slate-100 p-3 last:border-b-0 hover:bg-green-50/40 ${selectedProductId ===
                                                    product.id
                                                    ? "bg-green-50"
                                                    : ""
                                                    }`}
                                            >

                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100">

                                                    <Package className="h-6 w-6 text-green-700" />

                                                </div>


                                                <div className="min-w-0 flex-1">

                                                    <p className="truncate text-sm font-semibold text-slate-800">
                                                        {
                                                            product.name
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {
                                                            product.category
                                                        }
                                                    </p>

                                                </div>


                                                <div className="hidden text-right sm:block">

                                                    <p className="text-xs text-slate-500">
                                                        Stock:{" "}
                                                        {
                                                            product.currentStock
                                                        }
                                                    </p>

                                                    <p className="mt-1 text-sm font-bold text-slate-700">
                                                        ₹
                                                        {product.sellingPrice.toFixed(
                                                            2
                                                        )}
                                                        {" / "}
                                                        {
                                                            product.unit
                                                        }
                                                    </p>

                                                </div>


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        selectProduct(
                                                            product
                                                        )
                                                    }
                                                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${selectedProductId ===
                                                        product.id
                                                        ? "bg-green-700 text-white"
                                                        : "bg-green-600 text-white hover:bg-green-700"
                                                        }`}
                                                >
                                                    {selectedProductId ===
                                                        product.id
                                                        ? "Selected"
                                                        : "Add"}
                                                </button>

                                            </div>

                                        )
                                    )

                                )}

                            </div>


                            {/* SELECTED PRODUCT */}

                            {selectedProduct && (

                                <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">

                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                                        <div>

                                            <p className="text-sm font-bold text-green-900">
                                                {
                                                    selectedProduct.name
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-green-700">
                                                Stock:{" "}
                                                {
                                                    selectedProduct.currentStock
                                                }{" "}
                                                {
                                                    selectedProduct.unit
                                                }
                                                {" • "}
                                                ₹
                                                {selectedProduct.sellingPrice.toFixed(
                                                    2
                                                )}
                                            </p>

                                        </div>


                                        <div className="flex items-center gap-2">

                                            <div className="flex h-10 items-center overflow-hidden rounded-lg border border-green-200 bg-white">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setQuantity(
                                                            (value) =>
                                                                Math.max(
                                                                    1,
                                                                    value -
                                                                    1
                                                                )
                                                        )
                                                    }
                                                    className="h-full px-3 hover:bg-green-50"
                                                >
                                                    <Minus className="h-4 w-4" />
                                                </button>


                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={
                                                        quantity
                                                    }
                                                    onChange={(e) =>
                                                        setQuantity(
                                                            Number(
                                                                e
                                                                    .target
                                                                    .value
                                                            )
                                                        )
                                                    }
                                                    className="h-full w-14 border-x border-green-200 text-center text-sm font-semibold outline-none"
                                                />


                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setQuantity(
                                                            (value) =>
                                                                Math.min(
                                                                    selectedProduct.currentStock,
                                                                    value +
                                                                    1
                                                                )
                                                        )
                                                    }
                                                    className="h-full px-3 hover:bg-green-50"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>

                                            </div>


                                            <button
                                                type="button"
                                                onClick={
                                                    addItemToCart
                                                }
                                                className="flex h-10 items-center gap-2 rounded-lg bg-green-700 px-4 text-xs font-semibold text-white hover:bg-green-800"
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add
                                            </button>

                                        </div>

                                    </div>

                                </div>

                            )}

                        </section>


                        {/* ==================================================
                            BILL ITEMS
                        ================================================== */}

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

                            <div className="flex items-center justify-between border-b border-slate-100 p-5">

                                <div>

                                    <h2 className="font-semibold text-slate-800">
                                        Bill Items
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">

                                        {cart.length} item
                                        {cart.length !== 1
                                            ? "s"
                                            : ""}{" "}
                                        added

                                    </p>

                                </div>


                                <span className="rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700">

                                    ₹
                                    {grandTotal.toFixed(
                                        2
                                    )}

                                </span>

                            </div>


                            <div className="overflow-x-auto">

                                <table className="w-full min-w-[650px] text-left text-sm">

                                    <thead className="bg-slate-50">

                                        <tr className="border-b border-slate-100 text-xs text-slate-500">

                                            <th className="px-4 py-3">
                                                #
                                            </th>

                                            <th className="px-4 py-3">
                                                Product
                                            </th>

                                            <th className="px-4 py-3">
                                                Qty
                                            </th>

                                            <th className="px-4 py-3">
                                                Rate (₹)
                                            </th>

                                            <th className="px-4 py-3">
                                                Amount (₹)
                                            </th>

                                            <th className="px-4 py-3">
                                                Action
                                            </th>

                                        </tr>

                                    </thead>


                                    <tbody>

                                        {cart.map(
                                            (
                                                item,
                                                index
                                            ) => (

                                                <tr
                                                    key={
                                                        item.productId
                                                    }
                                                    className="border-b border-slate-100 last:border-0"
                                                >

                                                    <td className="px-4 py-4 text-xs text-slate-500">
                                                        {
                                                            index +
                                                            1
                                                        }
                                                    </td>


                                                    <td className="px-4 py-4">

                                                        <p className="font-medium text-slate-800">
                                                            {
                                                                item.productName
                                                            }
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            {
                                                                item.unit
                                                            }
                                                        </p>

                                                    </td>


                                                    <td className="px-4 py-4">

                                                        <div className="flex w-fit items-center overflow-hidden rounded-lg border border-slate-200">

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    item.quantity <=
                                                                    1
                                                                }
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item.productId,
                                                                        item.quantity -
                                                                        1
                                                                    )
                                                                }
                                                                className="px-2 py-1.5 hover:bg-slate-50 disabled:opacity-30"
                                                            >
                                                                <Minus className="h-3.5 w-3.5" />
                                                            </button>


                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={
                                                                    item.stockAvailable
                                                                }
                                                                value={
                                                                    item.quantity
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    updateQuantity(
                                                                        item.productId,
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    )
                                                                }
                                                                className="w-12 border-x border-slate-200 py-1.5 text-center text-xs font-semibold outline-none"
                                                            />


                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    item.quantity >=
                                                                    item.stockAvailable
                                                                }
                                                                onClick={() =>
                                                                    updateQuantity(
                                                                        item.productId,
                                                                        item.quantity +
                                                                        1
                                                                    )
                                                                }
                                                                className="px-2 py-1.5 hover:bg-slate-50 disabled:opacity-30"
                                                            >
                                                                <Plus className="h-3.5 w-3.5" />
                                                            </button>

                                                        </div>

                                                    </td>


                                                    <td className="px-4 py-4 text-slate-600">
                                                        ₹
                                                        {item.sellingPrice.toFixed(
                                                            2
                                                        )}
                                                    </td>


                                                    <td className="px-4 py-4 font-semibold text-slate-800">
                                                        ₹
                                                        {item.amount.toFixed(
                                                            2
                                                        )}
                                                    </td>


                                                    <td className="px-4 py-4">

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeItem(
                                                                    item.productId
                                                                )
                                                            }
                                                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>

                                                    </td>

                                                </tr>

                                            )
                                        )}


                                        {cart.length ===
                                            0 && (

                                                <tr>

                                                    <td
                                                        colSpan={
                                                            6
                                                        }
                                                        className="px-5 py-12 text-center"
                                                    >

                                                        <Receipt className="mx-auto h-8 w-8 text-slate-300" />

                                                        <p className="mt-3 text-sm font-medium text-slate-500">
                                                            No products added
                                                        </p>

                                                        <p className="mt-1 text-xs text-slate-400">
                                                            Select a product above to start the bill.
                                                        </p>

                                                    </td>

                                                </tr>

                                            )}

                                    </tbody>

                                </table>

                            </div>


                            {cart.length > 0 && (

                                <div className="flex justify-end border-t border-slate-100 p-4">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCart([])
                                        }
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Clear Bill
                                    </button>

                                </div>

                            )}

                        </section>

                    </div>


                    {/* ==================================================
                        RIGHT SIDE
                    ================================================== */}

                    <aside className="xl:sticky xl:top-4 xl:self-start">

                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">


                            {/* PREVIEW HEADER */}

                            <div className="border-b border-slate-100 p-5">

                                <div className="flex items-start justify-between gap-3">

                                    <div>

                                        <div className="flex items-center gap-2">

                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">

                                                <Package className="h-6 w-6 text-green-700" />

                                            </div>


                                            <div>

                                                <h2 className="text-lg font-bold text-green-800">
                                                    NEW BALAJI RUTHU DEPO
                                                </h2>

                                                <p className="text-xs text-slate-500">
                                                    Agricultural Products & Inputs
                                                </p>

                                            </div>

                                        </div>

                                    </div>


                                    <button
                                        type="button"
                                        onClick={() =>
                                            window.print()
                                        }
                                        className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex"
                                    >
                                        <Printer className="h-4 w-4" />
                                        Print Preview
                                    </button>

                                </div>

                            </div>


                            {/* BILL PREVIEW */}

                            <div className="p-5">


                                {/* BILL META */}

                                <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-xs">

                                    <div>

                                        <span className="text-slate-500">
                                            Bill No:
                                        </span>{" "}

                                        <span className="font-bold text-slate-800">
                                            {billNumber}
                                        </span>

                                    </div>


                                    <div>

                                        <span className="text-slate-500">
                                            Date:
                                        </span>{" "}

                                        <span className="font-semibold text-slate-800">
                                            {formattedDate}
                                        </span>

                                    </div>

                                </div>


                                {/* CUSTOMER */}

                                <div className="grid grid-cols-2 gap-4 border-b border-slate-100 py-4">

                                    <div>

                                        <p className="text-[11px] font-semibold uppercase text-slate-400">
                                            Customer
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {customerName ||
                                                "Walk-in Customer"}
                                        </p>

                                    </div>


                                    <div>

                                        <p className="text-[11px] font-semibold uppercase text-slate-400">
                                            Phone
                                        </p>

                                        <p className="mt-1 text-sm font-semibold text-slate-800">
                                            {customerPhone ||
                                                "-"}
                                        </p>

                                    </div>

                                </div>


                                {/* PREVIEW ITEMS */}

                                <div className="overflow-hidden rounded-xl border border-slate-100">

                                    <table className="w-full text-xs">

                                        <thead className="bg-green-50 text-green-900">

                                            <tr>

                                                <th className="px-2 py-3 text-left">
                                                    #
                                                </th>

                                                <th className="px-2 py-3 text-left">
                                                    Product
                                                </th>

                                                <th className="px-2 py-3 text-right">
                                                    Qty
                                                </th>

                                                <th className="px-2 py-3 text-right">
                                                    Rate
                                                </th>

                                                <th className="px-2 py-3 text-right">
                                                    Amount
                                                </th>

                                            </tr>

                                        </thead>


                                        <tbody>

                                            {cart.map(
                                                (
                                                    item,
                                                    index
                                                ) => (

                                                    <tr
                                                        key={
                                                            item.productId
                                                        }
                                                        className="border-t border-slate-100"
                                                    >

                                                        <td className="px-2 py-3 text-slate-500">
                                                            {
                                                                index +
                                                                1
                                                            }
                                                        </td>


                                                        <td className="max-w-[130px] px-2 py-3 font-medium text-slate-700">

                                                            <span className="line-clamp-2">
                                                                {
                                                                    item.productName
                                                                }
                                                            </span>

                                                        </td>


                                                        <td className="px-2 py-3 text-right text-slate-600">
                                                            {
                                                                item.quantity
                                                            }{" "}
                                                            {
                                                                item.unit
                                                            }
                                                        </td>


                                                        <td className="px-2 py-3 text-right text-slate-600">
                                                            {item.sellingPrice.toFixed(
                                                                0
                                                            )}
                                                        </td>


                                                        <td className="px-2 py-3 text-right font-semibold text-slate-800">
                                                            {item.amount.toFixed(
                                                                0
                                                            )}
                                                        </td>

                                                    </tr>

                                                )
                                            )}


                                            {cart.length ===
                                                0 && (

                                                    <tr>

                                                        <td
                                                            colSpan={
                                                                5
                                                            }
                                                            className="py-10 text-center text-slate-400"
                                                        >
                                                            No items
                                                        </td>

                                                    </tr>

                                                )}

                                        </tbody>

                                    </table>

                                </div>


                                {/* TOTALS */}

                                <div className="mt-4 space-y-2">

                                    <div className="flex justify-between text-sm text-slate-600">

                                        <span>
                                            Subtotal
                                        </span>

                                        <span>
                                            ₹
                                            {subtotal.toFixed(
                                                2
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-bold text-slate-800">

                                        <span>
                                            Grand Total
                                        </span>

                                        <span>
                                            ₹
                                            {grandTotal.toFixed(
                                                2
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between text-xs text-slate-500">

                                        <span>
                                            Paid Amount
                                        </span>

                                        <span>
                                            ₹
                                            {paidAmount.toFixed(
                                                2
                                            )}
                                        </span>

                                    </div>


                                    <div className="flex justify-between text-xs font-semibold text-red-600">

                                        <span>
                                            Outstanding
                                        </span>

                                        <span>
                                            ₹
                                            {outstanding.toFixed(
                                                2
                                            )}
                                        </span>

                                    </div>

                                </div>


                                {/* PAYMENT MODE */}

                                <div className="mt-5">

                                    <p className="mb-2 text-xs font-semibold text-slate-700">
                                        Payment Mode
                                    </p>


                                    <div className="grid grid-cols-4 gap-2">

                                        <PaymentButton
                                            active={
                                                paymentMode ===
                                                "Cash"
                                            }
                                            icon={
                                                <Wallet className="h-4 w-4" />
                                            }
                                            label="Cash"
                                            onClick={() =>
                                                setPaymentMode(
                                                    "Cash"
                                                )
                                            }
                                        />


                                        <PaymentButton
                                            active={
                                                paymentMode ===
                                                "UPI"
                                            }
                                            icon={
                                                <Zap className="h-4 w-4" />
                                            }
                                            label="UPI"
                                            onClick={() =>
                                                setPaymentMode(
                                                    "UPI"
                                                )
                                            }
                                        />


                                        <PaymentButton
                                            active={
                                                paymentMode ===
                                                "Card"
                                            }
                                            icon={
                                                <CreditCard className="h-4 w-4" />
                                            }
                                            label="Card"
                                            onClick={() =>
                                                setPaymentMode(
                                                    "Card"
                                                )
                                            }
                                        />


                                        <PaymentButton
                                            active={
                                                paymentMode ===
                                                "Other"
                                            }
                                            icon={
                                                <Wallet className="h-4 w-4" />
                                            }
                                            label="Other"
                                            onClick={() =>
                                                setPaymentMode(
                                                    "Other"
                                                )
                                            }
                                        />

                                    </div>

                                </div>


                                {/* PAID AMOUNT */}

                                <div className="mt-5 grid grid-cols-2 gap-3">

                                    <div>

                                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                            Received Amount
                                        </label>


                                        <input
                                            type="number"
                                            min="0"
                                            max={
                                                grandTotal
                                            }
                                            value={
                                                paidAmount ||
                                                ""
                                            }
                                            onChange={(
                                                e
                                            ) => {

                                                const value =
                                                    Number(
                                                        e
                                                            .target
                                                            .value
                                                    );

                                                setPaidAmount(
                                                    Math.min(
                                                        Math.max(
                                                            0,
                                                            value
                                                        ),
                                                        grandTotal
                                                    )
                                                );

                                            }}
                                            placeholder="0"
                                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                        />

                                    </div>


                                    <div>

                                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                            Change Amount
                                        </label>


                                        <div className="flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">

                                            ₹
                                            {Math.max(
                                                0,
                                                paidAmount -
                                                grandTotal
                                            ).toFixed(
                                                2
                                            )}

                                        </div>

                                    </div>

                                </div>


                                {/* PAYMENT STATUS */}

                                <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">

                                    <div className="flex items-center gap-2">

                                        <Check className="h-4 w-4 text-green-600" />

                                        <span className="text-xs font-semibold text-slate-600">
                                            Payment Status
                                        </span>

                                    </div>


                                    <span
                                        className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatus ===
                                            "Paid"
                                            ? "bg-green-100 text-green-700"
                                            : paymentStatus ===
                                                "Partial"
                                                ? "bg-amber-100 text-amber-700"
                                                : "bg-red-100 text-red-700"
                                            }`}
                                    >
                                        {
                                            paymentStatus
                                        }
                                    </span>

                                </div>


                                {/* ==================================================
                                    COMPLETE SALE
                                ================================================== */}

                                <button
                                    type="button"
                                    onClick={
                                        handleSaveBill
                                    }
                                    disabled={
                                        savingBill ||
                                        cart.length ===
                                        0
                                    }
                                    className="mt-5 flex h-12 w-full items-center justify-between rounded-xl bg-green-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >

                                    <span className="flex items-center gap-2">

                                        <Wallet className="h-5 w-5" />

                                        {savingBill
                                            ? "Saving Bill..."
                                            : "Complete Sale"}

                                    </span>


                                    <ArrowRight className="h-5 w-5" />

                                </button>


                                {/* ==================================================
                                    ACTIONS
                                ================================================== */}

                                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

                                    <ActionButton
                                        icon={
                                            <Save className="h-4 w-4" />
                                        }
                                        label="Save Bill"
                                        onClick={
                                            handleSaveBill
                                        }
                                        disabled={
                                            savingBill ||
                                            cart.length ===
                                            0
                                        }
                                    />


                                    <ActionButton
                                        icon={
                                            <Printer className="h-4 w-4" />
                                        }
                                        label="Print Bill"
                                        onClick={() =>
                                            window.print()
                                        }
                                    />


                                    <ActionButton
                                        icon={
                                            <Phone className="h-4 w-4" />
                                        }
                                        label="WhatsApp"
                                        onClick={
                                            handleWhatsApp
                                        }
                                    />


                                    <ActionButton
                                        icon={
                                            <Share2 className="h-4 w-4" />
                                        }
                                        label="Share PDF"
                                        onClick={() =>
                                            alert(
                                                "PDF sharing will be connected next."
                                            )
                                        }
                                    />

                                </div>

                            </div>

                        </section>

                    </aside>

                </div>

            </main>


            {/* ==================================================
                THERMAL PRINT BILL
            ================================================== */}

            {printBill && (

                <div className="thermal-print-bill">

                    <div className="thermal-header">

                        <h1>
                            NEW BALAJI RUTHU DEPO
                        </h1>

                        <p>
                            Agricultural Products &
                            Inputs
                        </p>

                    </div>


                    <div className="thermal-meta">

                        <div>
                            Bill:{" "}
                            {
                                printBill.billNumber
                            }
                        </div>

                        <div>
                            Date:{" "}
                            {
                                printBill.billDate
                            }
                        </div>

                        <div>
                            Customer:{" "}
                            {
                                printBill.customerName
                            }
                        </div>

                        <div>
                            Phone:{" "}
                            {
                                printBill.customerPhone
                            }
                        </div>

                    </div>


                    <table>

                        <thead>

                            <tr>

                                <th>
                                    ITEM
                                </th>

                                <th>
                                    QTY
                                </th>

                                <th>
                                    RATE
                                </th>

                                <th>
                                    AMT
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {printBill.items.map(
                                (item) => (

                                    <tr
                                        key={
                                            item.productId
                                        }
                                    >

                                        <td>
                                            {
                                                item.productName
                                            }
                                        </td>

                                        <td>
                                            {
                                                item.quantity
                                            }
                                        </td>

                                        <td>
                                            ₹
                                            {item.sellingPrice.toFixed(
                                                2
                                            )}
                                        </td>

                                        <td>
                                            ₹
                                            {item.amount.toFixed(
                                                2
                                            )}
                                        </td>

                                    </tr>

                                )
                            )}

                        </tbody>

                    </table>


                    <div className="thermal-total">

                        <div>

                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ₹
                                {printBill.subtotal.toFixed(
                                    2
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                GRAND TOTAL
                            </span>

                            <strong>
                                ₹
                                {printBill.grandTotal.toFixed(
                                    2
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Paid
                            </span>

                            <strong>
                                ₹
                                {printBill.paidAmount.toFixed(
                                    2
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                Status
                            </span>

                            <strong>
                                {
                                    printBill.paymentStatus
                                }
                            </strong>

                        </div>

                    </div>


                    <div className="thermal-footer">
                        Thank you for your business
                    </div>

                </div>

            )}


            {/* ==================================================
                THERMAL PRINT CSS
            ================================================== */}

            <style>
                {`
                    .thermal-print-bill {
                        display: none;
                    }

                    @media print {

                        @page {
                            size: 58mm auto;
                            margin: 0;
                        }

                        html,
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 58mm !important;
                            background: white !important;
                        }

                        body * {
                            visibility: hidden !important;
                        }

                        .thermal-print-bill,
                        .thermal-print-bill * {
                            visibility: visible !important;
                        }

                        .thermal-print-bill {
                            display: block !important;
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 58mm !important;
                            padding: 3mm !important;
                            box-sizing: border-box !important;
                            background: white !important;
                            color: black !important;
                            font-family: Arial, sans-serif !important;
                            font-size: 9px !important;
                        }

                        .thermal-header {
                            text-align: center;
                            border-bottom: 1px dashed #000;
                            padding-bottom: 7px;
                            margin-bottom: 7px;
                        }

                        .thermal-header h1 {
                            margin: 0;
                            font-size: 13px;
                            font-weight: 800;
                        }

                        .thermal-header p {
                            margin: 3px 0 0;
                            font-size: 8px;
                        }

                        .thermal-meta {
                            margin-bottom: 8px;
                            font-size: 8px;
                            line-height: 1.6;
                        }

                        .thermal-print-bill table {
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                            font-size: 8px;
                        }

                        .thermal-print-bill th,
                        .thermal-print-bill td {
                            padding: 3px 1px;
                            vertical-align: top;
                        }

                        .thermal-print-bill th {
                            border-bottom: 1px dashed #000;
                            font-weight: 800;
                        }

                        .thermal-print-bill th:first-child,
                        .thermal-print-bill td:first-child {
                            width: 43%;
                            text-align: left;
                            word-break: break-word;
                        }

                        .thermal-print-bill th:nth-child(2),
                        .thermal-print-bill td:nth-child(2) {
                            width: 14%;
                            text-align: right;
                        }

                        .thermal-print-bill th:nth-child(3),
                        .thermal-print-bill td:nth-child(3) {
                            width: 20%;
                            text-align: right;
                        }

                        .thermal-print-bill th:nth-child(4),
                        .thermal-print-bill td:nth-child(4) {
                            width: 23%;
                            text-align: right;
                        }

                        .thermal-total {
                            margin-top: 8px;
                            border-top: 1px dashed #000;
                            padding-top: 5px;
                        }

                        .thermal-total > div {
                            display: flex;
                            justify-content: space-between;
                            padding: 2px 0;
                            font-size: 8px;
                        }

                        .thermal-total > div:nth-child(2) {
                            border-top: 1px solid #000;
                            border-bottom: 1px solid #000;
                            margin: 3px 0;
                            padding: 5px 0;
                            font-size: 11px;
                            font-weight: 800;
                        }

                        .thermal-footer {
                            margin-top: 12px;
                            padding-top: 7px;
                            border-top: 1px dashed #000;
                            text-align: center;
                            font-size: 8px;
                            font-weight: 600;
                        }
                    }
                `}
            </style>

        </div>
    );
}


// ============================================================
// PAYMENT BUTTON
// ============================================================

interface PaymentButtonProps {
    active: boolean;
    icon: ReactNode;
    label: string;
    onClick: () => void;
}

function PaymentButton({
    active,
    icon,
    label,
    onClick,
}: PaymentButtonProps) {

    return (

        <button
            type="button"
            onClick={onClick}
            className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-semibold transition ${active
                ? "border-green-700 bg-green-700 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
        >

            {icon}

            {label}

        </button>

    );
}


// ============================================================
// ACTION BUTTON
// ============================================================

interface ActionButtonProps {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

function ActionButton({
    icon,
    label,
    onClick,
    disabled = false,
}: ActionButtonProps) {

    return (

        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >

            {icon}

            {label}

        </button>

    );
}


// ============================================================
// EXPORT
// ============================================================

export default Billing;