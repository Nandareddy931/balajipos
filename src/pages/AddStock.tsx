
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Plus,
    Trash2,
    Package,
    Loader2,
    AlertCircle,
    RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    increment,
    query,
    serverTimestamp,
    where,
    writeBatch,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

interface StockItem {
    id: number;
    productId: string;
    product: string;
    batch: string;
    manufacturingDate: string;
    expiryDate: string;
    pack: string;
    quantity: number;
    rate: number;
}

interface Product {
    id: string;
    name: string;
    category: string;
    manufacturer: string;
    sellingPrice: number;
    minimumStock: number;
    currentStock: number;
    active: boolean;
}

interface SupplierDetails {
    supplier: string;
    invoiceNumber: string;
    invoiceDate: string;
    billMode: string;
    deliveryDate: string;
    transport: string;
    notes: string;
}

const createEmptyItem = (): StockItem => ({
    id: Date.now() + Math.floor(Math.random() * 100000),
    productId: "",
    product: "",
    batch: "",
    manufacturingDate: "",
    expiryDate: "",
    pack: "",
    quantity: 0,
    rate: 0,
});

const initialSupplierDetails: SupplierDetails = {
    supplier: "",
    invoiceNumber: "",
    invoiceDate: "",
    billMode: "Credit",
    deliveryDate: "",
    transport: "",
    notes: "",
};

function AddStock() {
    const navigate = useNavigate();

    const [items, setItems] = useState<StockItem[]>([
        createEmptyItem(),
    ]);

    const [products, setProducts] = useState<Product[]>([]);
    const [supplierDetails, setSupplierDetails] =
        useState<SupplierDetails>(initialSupplierDetails);

    const [authLoading, setAuthLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [saveError, setSaveError] = useState("");

    // --------------------------------------------------
    // 1. LOAD PRODUCTS AFTER FIREBASE AUTH IS READY
    // --------------------------------------------------

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setProducts([]);
                setAuthLoading(false);
                setLoadError("Please log in to access your shop products.");
                return;
            }

            setAuthLoading(false);
            setProductsLoading(true);
            setLoadError("");

            try {
                const productsQuery = query(
                    collection(db, "products"),
                    where("shopId", "==", user.uid)
                );

                const snapshot = await getDocs(productsQuery);

                const loadedProducts: Product[] = snapshot.docs.map(
                    (productDoc) => {
                        const data = productDoc.data();

                        return {
                            id: productDoc.id,
                            name:
                                typeof data.name === "string"
                                    ? data.name
                                    : "",
                            category:
                                typeof data.category === "string"
                                    ? data.category
                                    : "",
                            manufacturer:
                                typeof data.manufacturer === "string"
                                    ? data.manufacturer
                                    : "",
                            sellingPrice:
                                typeof data.sellingPrice === "number"
                                    ? data.sellingPrice
                                    : 0,
                            minimumStock:
                                typeof data.minimumStock === "number"
                                    ? data.minimumStock
                                    : 0,
                            currentStock:
                                typeof data.currentStock === "number"
                                    ? data.currentStock
                                    : 0,
                            active:
                                typeof data.active === "boolean"
                                    ? data.active
                                    : true,
                        };
                    }
                );

                setProducts(loadedProducts);
                console.log(
                    "Products loaded for shop:",
                    user.uid,
                    loadedProducts
                );
            } catch (error) {
                console.error("Failed to load products:", error);
                setLoadError(
                    error instanceof Error
                        ? error.message
                        : "Unable to load products."
                );
            } finally {
                setProductsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    // --------------------------------------------------
    // 2. PRODUCT AND ITEM HANDLERS
    // --------------------------------------------------

    const addProduct = () => {
        setItems((currentItems) => [
            ...currentItems,
            createEmptyItem(),
        ]);
    };

    const removeProduct = (id: number) => {
        setItems((currentItems) =>
            currentItems.length > 1
                ? currentItems.filter((item) => item.id !== id)
                : currentItems
        );
    };

    const updateItem = (
        id: number,
        field: keyof StockItem,
        value: string | number
    ) => {
        setItems((currentItems) =>
            currentItems.map((item) =>
                item.id === id
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const updateSupplier = (
        field: keyof SupplierDetails,
        value: string
    ) => {
        setSupplierDetails((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const getItemAmount = (item: StockItem) =>
        item.quantity * item.rate;

    const subtotal = useMemo(
        () =>
            items.reduce(
                (total, item) => total + getItemAmount(item),
                0
            ),
        [items]
    );

    // --------------------------------------------------
    // 3. RELOAD PRODUCTS
    // --------------------------------------------------

    const reloadProducts = async () => {
        const user = auth.currentUser;

        if (!user) {
            setLoadError("Please log in first.");
            return;
        }

        setProductsLoading(true);
        setLoadError("");

        try {
            const productsQuery = query(
                collection(db, "products"),
                where("shopId", "==", user.uid)
            );

            const snapshot = await getDocs(productsQuery);

            const loadedProducts: Product[] = snapshot.docs.map(
                (productDoc) => {
                    const data = productDoc.data();

                    return {
                        id: productDoc.id,
                        name: data.name ?? "",
                        category: data.category ?? "",
                        manufacturer: data.manufacturer ?? "",
                        sellingPrice: data.sellingPrice ?? 0,
                        minimumStock: data.minimumStock ?? 0,
                        currentStock: data.currentStock ?? 0,
                        active: data.active ?? true,
                    };
                }
            );

            setProducts(loadedProducts);
        } catch (error) {
            console.error("Product reload failed:", error);
            setLoadError(
                error instanceof Error
                    ? error.message
                    : "Unable to reload products."
            );
        } finally {
            setProductsLoading(false);
        }
    };

    // --------------------------------------------------
    // 4. VALIDATE STOCK ENTRY
    // --------------------------------------------------

    const validateStock = (): boolean => {
        if (!supplierDetails.supplier.trim()) {
            alert("Please enter supplier / dealer name.");
            return false;
        }

        if (!supplierDetails.invoiceNumber.trim()) {
            alert("Please enter invoice number.");
            return false;
        }

        if (!supplierDetails.invoiceDate) {
            alert("Please select invoice date.");
            return false;
        }

        if (items.length === 0) {
            alert("Please add at least one product.");
            return false;
        }

        for (const item of items) {
            if (!item.productId) {
                alert("Please select a product for all items.");
                return false;
            }

            const selectedProduct = products.find(
                (product) => product.id === item.productId
            );

            if (!selectedProduct) {
                alert(
                    `Product "${item.product}" is unavailable. Please select it again.`
                );
                return false;
            }

            if (!selectedProduct.active) {
                alert(
                    `${selectedProduct.name} is inactive. Please select an active product.`
                );
                return false;
            }

            if (!item.batch.trim()) {
                alert(`Please enter batch number for ${item.product}.`);
                return false;
            }

            if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
                alert(
                    `Quantity must be greater than 0 for ${item.product}.`
                );
                return false;
            }

            if (!Number.isFinite(item.rate) || item.rate <= 0) {
                alert(
                    `Rate must be greater than 0 for ${item.product}.`
                );
                return false;
            }

            if (
                item.manufacturingDate &&
                item.expiryDate &&
                item.expiryDate < item.manufacturingDate
            ) {
                alert(
                    `Expiry date cannot be earlier than manufacturing date for ${item.product}.`
                );
                return false;
            }
        }

        return true;
    };

    // --------------------------------------------------
    // 5. SAVE STOCK
    // --------------------------------------------------

    const saveStock = async () => {
        if (saving) return;

        const user = auth.currentUser;

        if (!user) {
            alert("Your session has expired. Please log in again.");
            return;
        }

        if (!validateStock()) return;

        const shopId = user.uid;

        setSaving(true);
        setSaveError("");

        try {
            // Verify that every selected product belongs to this shop.
            const uniqueProductIds = [
                ...new Set(items.map((item) => item.productId)),
            ];

            const productSnapshots = await Promise.all(
                uniqueProductIds.map(async (productId) => {
                    const productRef = doc(db, "products", productId);
                    const snapshot = await getDoc(productRef);

                    if (!snapshot.exists()) {
                        throw new Error(
                            `Product ${productId} no longer exists.`
                        );
                    }

                    if (snapshot.data().shopId !== shopId) {
                        throw new Error(
                            "A selected product does not belong to your shop."
                        );
                    }

                    return productId;
                })
            );

            // Aggregate product quantities to avoid repeated stock updates.
            const productTotals = new Map<string, number>();

            // Aggregate batch quantities for repeated product + batch rows.
            const batchTotals = new Map<
                string,
                {
                    productId: string;
                    productName: string;
                    batchNumber: string;
                    manufacturingDate: string;
                    expiryDate: string;
                    pack: string;
                    quantity: number;
                    rate: number;
                }
            >();

            for (const item of items) {
                productTotals.set(
                    item.productId,
                    (productTotals.get(item.productId) ?? 0) +
                    item.quantity
                );

                const normalizedBatch = item.batch
                    .trim()
                    .replace(/\s+/g, "_");

                const batchId =
                    `${item.productId}_${normalizedBatch}`;

                const existing = batchTotals.get(batchId);

                if (existing) {
                    existing.quantity += item.quantity;
                    existing.rate = item.rate;
                    existing.manufacturingDate =
                        item.manufacturingDate;
                    existing.expiryDate = item.expiryDate;
                    existing.pack = item.pack.trim();
                } else {
                    batchTotals.set(batchId, {
                        productId: item.productId,
                        productName: item.product.trim(),
                        batchNumber: item.batch.trim(),
                        manufacturingDate: item.manufacturingDate,
                        expiryDate: item.expiryDate,
                        pack: item.pack.trim(),
                        quantity: item.quantity,
                        rate: item.rate,
                    });
                }
            }

            // Read existing batches before creating the write batch.
            const existingBatches = new Map<
                string,
                {
                    exists: boolean;
                }
            >();

            for (const [batchId] of batchTotals) {
                const batchRef = doc(
                    db,
                    "productBatches",
                    batchId
                );

                const snapshot = await getDoc(batchRef);

                if (
                    snapshot.exists() &&
                    snapshot.data().shopId !== shopId
                ) {
                    throw new Error(
                        `Batch ${batchId} belongs to another shop.`
                    );
                }

                existingBatches.set(batchId, {
                    exists: snapshot.exists(),
                });
            }

            // Firestore batches support a maximum of 500 writes.
            // Reserve room for invoice, movements, batches and products.
            const totalWrites =
                1 +
                items.length +
                batchTotals.size +
                productTotals.size;

            if (totalWrites > 450) {
                throw new Error(
                    "This invoice contains too many stock entries for one save. Please split it into smaller invoices."
                );
            }

            const batch = writeBatch(db);

            // A. Create stock-in document.
            const stockInRef = doc(collection(db, "stockIns"));

            const stockInData = {
                shopId,
                supplier: supplierDetails.supplier.trim(),
                invoiceNumber:
                    supplierDetails.invoiceNumber.trim(),
                invoiceDate: supplierDetails.invoiceDate,
                billMode: supplierDetails.billMode,
                deliveryDate: supplierDetails.deliveryDate,
                transport: supplierDetails.transport.trim(),
                notes: supplierDetails.notes.trim(),

                items: items.map((item) => ({
                    productId: item.productId,
                    product: item.product.trim(),
                    batch: item.batch.trim(),
                    manufacturingDate: item.manufacturingDate,
                    expiryDate: item.expiryDate,
                    pack: item.pack.trim(),
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: getItemAmount(item),
                })),

                subtotal,
                grandTotal: subtotal,
                createdAt: serverTimestamp(),
            };

            batch.set(stockInRef, stockInData);

            // B. Create a stock movement for every invoice row.
            for (const item of items) {
                const movementRef = doc(
                    collection(db, "stockMovements")
                );

                batch.set(movementRef, {
                    shopId,
                    stockInId: stockInRef.id,
                    product: item.product.trim(),
                    productId: item.productId,
                    batch: item.batch.trim(),
                    pack: item.pack.trim(),
                    type: "STOCK_IN",
                    quantity: item.quantity,
                    rate: item.rate,
                    amount: getItemAmount(item),
                    invoiceNumber:
                        supplierDetails.invoiceNumber.trim(),
                    supplier:
                        supplierDetails.supplier.trim(),
                    movementDate: supplierDetails.invoiceDate,
                    createdAt: serverTimestamp(),
                });
            }

            // C. Create or update each unique product batch.
            for (const [batchId, batchData] of batchTotals) {
                const batchRef = doc(
                    db,
                    "productBatches",
                    batchId
                );

                const existing = existingBatches.get(batchId);

                if (existing?.exists) {
                    batch.update(batchRef, {
                        quantityReceived: increment(
                            batchData.quantity
                        ),
                        currentQuantity: increment(
                            batchData.quantity
                        ),
                        updatedAt: serverTimestamp(),
                        purchaseRate: batchData.rate,
                        supplier:
                            supplierDetails.supplier.trim(),
                        invoiceNumber:
                            supplierDetails.invoiceNumber.trim(),
                    });
                } else {
                    batch.set(batchRef, {
                        shopId,
                        productId: batchData.productId,
                        productName: batchData.productName,
                        batchNumber: batchData.batchNumber,
                        manufacturingDate:
                            batchData.manufacturingDate,
                        expiryDate: batchData.expiryDate,
                        pack: batchData.pack,
                        quantityReceived: batchData.quantity,
                        currentQuantity: batchData.quantity,
                        purchaseRate: batchData.rate,
                        supplier:
                            supplierDetails.supplier.trim(),
                        invoiceNumber:
                            supplierDetails.invoiceNumber.trim(),
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp(),
                    });
                }
            }

            // D. Increase total product stock.
            for (const [productId, quantity] of productTotals) {
                const productRef = doc(
                    db,
                    "products",
                    productId
                );

                batch.update(productRef, {
                    currentStock: increment(quantity),
                    updatedAt: serverTimestamp(),
                });
            }

            // E. Commit all changes together.
            await batch.commit();

            console.log("Stock saved successfully:", {
                stockInId: stockInRef.id,
                shopId,
                products: productSnapshots,
                totalItems: items.length,
                subtotal,
            });

            alert("Stock saved successfully.");

            navigate("/stock-in");
        } catch (error) {
            console.error("Failed to save stock:", error);

            const message =
                error instanceof Error
                    ? error.message
                    : "Unknown Firebase error.";

            setSaveError(message);
            alert(`Unable to save stock: ${message}`);
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------
    // 6. UI
    // --------------------------------------------------

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
                            Add Stock
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Manually record stock received from supplier
                        </p>
                    </div>
                </div>
            </div>

            <main className="p-6">
                {/* Authentication / product loading */}
                {(authLoading || productsLoading) && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {authLoading
                            ? "Checking your login..."
                            : "Loading your shop products..."}
                    </div>
                )}

                {loadError && (
                    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <span>{loadError}</span>
                        </div>

                        <button
                            type="button"
                            onClick={reloadProducts}
                            className="flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 font-medium hover:bg-red-100"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Retry
                        </button>
                    </div>
                )}

                {saveError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        <strong>Save failed:</strong> {saveError}
                    </div>
                )}

                {/* Supplier Details */}
                <section className="rounded-2xl border bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-green-50 p-3">
                            <Package className="h-5 w-5 text-green-600" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Supplier Details
                            </h2>
                            <p className="text-sm text-slate-500">
                                Enter details from the supplier invoice
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Supplier / Dealer
                            </label>
                            <input
                                type="text"
                                value={supplierDetails.supplier}
                                onChange={(e) =>
                                    updateSupplier("supplier", e.target.value)
                                }
                                placeholder="Enter supplier name"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Invoice Number
                            </label>
                            <input
                                type="text"
                                value={supplierDetails.invoiceNumber}
                                onChange={(e) =>
                                    updateSupplier(
                                        "invoiceNumber",
                                        e.target.value
                                    )
                                }
                                placeholder="Enter invoice number"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={supplierDetails.invoiceDate}
                                onChange={(e) =>
                                    updateSupplier(
                                        "invoiceDate",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Bill Mode
                            </label>
                            <select
                                value={supplierDetails.billMode}
                                onChange={(e) =>
                                    updateSupplier("billMode", e.target.value)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            >
                                <option>Credit</option>
                                <option>Cash</option>
                                <option>UPI</option>
                            </select>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Delivery Date
                            </label>
                            <input
                                type="date"
                                value={supplierDetails.deliveryDate}
                                onChange={(e) =>
                                    updateSupplier(
                                        "deliveryDate",
                                        e.target.value
                                    )
                                }
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-600">
                                Transport
                            </label>
                            <input
                                type="text"
                                value={supplierDetails.transport}
                                onChange={(e) =>
                                    updateSupplier("transport", e.target.value)
                                }
                                placeholder="Transport name"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>
                </section>

                {/* Stock Items */}
                <section className="mt-6 rounded-2xl border bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                Stock Items
                            </h2>
                            <p className="text-sm text-slate-500">
                                Add all products received in this invoice
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                {products.length} products available in your shop
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={addProduct}
                            disabled={authLoading || productsLoading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add Product
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1100px] text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b">
                                    {[
                                        "Product",
                                        "Batch No.",
                                        "Mfg. Date",
                                        "Expiry Date",
                                        "Pack",
                                        "Qty",
                                        "Rate",
                                        "Amount",
                                        "Action",
                                    ].map((heading) => (
                                        <th
                                            key={heading}
                                            className="px-4 py-4 font-semibold text-slate-600"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id} className="border-b">
                                        {/* Product */}
                                        <td className="px-4 py-3">
                                            <select
                                                value={item.productId}
                                                disabled={
                                                    productsLoading ||
                                                    products.length === 0
                                                }
                                                onChange={(e) => {
                                                    const selectedProduct =
                                                        products.find(
                                                            (product) =>
                                                                product.id ===
                                                                e.target.value
                                                        );

                                                    if (!selectedProduct) return;

                                                    updateItem(
                                                        item.id,
                                                        "productId",
                                                        selectedProduct.id
                                                    );

                                                    updateItem(
                                                        item.id,
                                                        "product",
                                                        selectedProduct.name
                                                    );

                                                    updateItem(
                                                        item.id,
                                                        "rate",
                                                        selectedProduct.sellingPrice
                                                    );
                                                }}
                                                className="w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 disabled:bg-slate-100"
                                            >
                                                <option value="">
                                                    {productsLoading
                                                        ? "Loading products..."
                                                        : products.length === 0
                                                            ? "No products found"
                                                            : "Select product"}
                                                </option>

                                                {products
                                                    .filter((product) => product.active)
                                                    .map((product) => (
                                                        <option
                                                            key={product.id}
                                                            value={product.id}
                                                        >
                                                            {product.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </td>

                                        {/* Batch */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.batch}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "batch",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Batch"
                                                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Manufacturing Date */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={item.manufacturingDate}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "manufacturingDate",
                                                        e.target.value
                                                    )
                                                }
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Expiry Date */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="date"
                                                value={item.expiryDate}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "expiryDate",
                                                        e.target.value
                                                    )
                                                }
                                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Pack */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="text"
                                                value={item.pack}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "pack",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="1 KG"
                                                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Quantity */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={item.quantity || ""}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "quantity",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                placeholder="0"
                                                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Rate */}
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.rate || ""}
                                                onChange={(e) =>
                                                    updateItem(
                                                        item.id,
                                                        "rate",
                                                        Number(e.target.value)
                                                    )
                                                }
                                                placeholder="0.00"
                                                className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-500"
                                            />
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-3 font-semibold text-slate-700">
                                            ₹{getItemAmount(item).toFixed(2)}
                                        </td>

                                        {/* Delete */}
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeProduct(item.id)
                                                }
                                                disabled={items.length === 1}
                                                className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                                                title="Remove item"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Summary */}
                <section className="mt-6 grid gap-6 lg:grid-cols-2">
                    {/* Notes */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Notes
                        </h2>

                        <textarea
                            rows={5}
                            value={supplierDetails.notes}
                            onChange={(e) =>
                                updateSupplier("notes", e.target.value)
                            }
                            placeholder="Additional notes..."
                            className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                        />
                    </div>

                    {/* Purchase Summary */}
                    <div className="rounded-2xl border bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-semibold text-slate-800">
                            Purchase Summary
                        </h2>

                        <div className="mt-5 space-y-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">
                                    Subtotal
                                </span>
                                <span className="font-medium">
                                    ₹{subtotal.toFixed(2)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">
                                    Discount
                                </span>
                                <span className="font-medium">₹0.00</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">CGST</span>
                                <span className="font-medium">₹0.00</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-slate-500">SGST</span>
                                <span className="font-medium">₹0.00</span>
                            </div>

                            <div className="border-t pt-4">
                                <div className="flex justify-between">
                                    <span className="text-lg font-semibold text-slate-800">
                                        Grand Total
                                    </span>
                                    <span className="text-lg font-bold text-green-600">
                                        ₹{subtotal.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <Link
                        to="/stock-in"
                        className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </Link>

                    <button
                        type="button"
                        onClick={saveStock}
                        disabled={
                            saving ||
                            authLoading ||
                            productsLoading ||
                            products.length === 0
                        }
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving Stock...
                            </>
                        ) : (
                            "Save Stock"
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
}

export default AddStock;
