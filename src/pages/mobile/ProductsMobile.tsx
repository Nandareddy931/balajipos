import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Package,
    Menu,
    ShoppingCart,
    Home,
    Box,
    ClipboardList,
    LayoutGrid,
    Pencil,
    Power,
    Trash2,
    X,
    ChevronRight,
    ScanBarcode,
} from "lucide-react";
import BarcodeScanner from "../../components/BarcodeScanner";

import { lookupProductByBarcode } from "../../services/barcodeService";

import { findProductByBarcode } from "../../services/productService";

import {
    getProducts,
    addProduct,
    updateProduct,
    deactivateProduct,
    reactivateProduct,
    deleteProduct,
    type Product,
} from "../../services/productService";

const categories = [
    "Grocery & Provisions",
    "Beverages",
    "Snacks & Chocolates",
    "Dairy & Frozen Foods",
    "Bakery",
    "Fruits & Vegetables",
    "Personal Care",
    "Beauty & Cosmetics",
    "Household & Cleaning",
    "Home & Kitchen",
    "Clothing & Fashion",
    "Footwear",
    "Electronics",
    "Mobile Accessories",
    "Stationery & Books",
    "Toys & Games",
    "Baby Products",
    "Pet Supplies",
    "Hardware & Tools",
    "Sports & Fitness",
    "Automotive Accessories",
    "Other",
];

const emptyForm = {
    name: "",
    category: "Grocery & Provisions",
    manufacturer: "",
    barcode: "",
    imageUrl: "",
    unit: "Piece",
    sellingPrice: 0,
    currentStock: 0,
    minimumStock: 0,
    openingStock: 0,
};

type ProductForm = typeof emptyForm;

function ProductsMobile() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [category] = useState("All");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
    const [showNavigation, setShowNavigation] = useState(false);
    const [form, setForm] = useState<ProductForm>({ ...emptyForm });

    const loadProducts = async () => {
        try {
            setLoading(true);
            setProducts(await getProducts());
        } catch (error) {
            console.error("Failed to load products:", error);
            alert("Unable to load products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadProducts();
    }, []);

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                product.name.toLowerCase().includes(query) ||
                (product.manufacturer || "").toLowerCase().includes(query) ||
                product.category.toLowerCase().includes(query);

            const matchesCategory =
                category === "All" || product.category === category;

            return matchesSearch && matchesCategory;
        });
    }, [products, search, category]);

    const totalProducts = products.length;
    const inStock = products.filter(
        (product) => product.active && product.currentStock > product.minimumStock
    ).length;
    const lowStock = products.filter(
        (product) =>
            product.active &&
            product.currentStock <= product.minimumStock
    ).length;

    const openAddForm = () => {
        setEditingId(null);
        setForm({ ...emptyForm });
        setShowForm(true);
        setMenuId(null);
    };

    const openEditForm = (product: Product) => {
        setEditingId(product.id);
        setForm({
            name: product.name,
            category: product.category,
            manufacturer: product.manufacturer || "",
            barcode: product.barcode || "",
            imageUrl: product.imageUrl || "",
            unit: product.unit || "Kg",
            sellingPrice: product.sellingPrice,
            currentStock: product.currentStock,
            minimumStock: product.minimumStock,
            openingStock: 0,

        });
        setShowForm(true);
        setMenuId(null);
    };
    const handleBarcodeScan = useCallback(async (barcode: string) => {
        setShowScanner(false);
        setScanning(true);

        try {
            // First check whether this barcode already exists in this shop.
            const existingProduct = await findProductByBarcode(barcode);

            if (existingProduct) {
                alert(
                    `This barcode already exists!\nProduct: ${existingProduct.name}`
                );
                setSearch(existingProduct.name);
                return;
            }

            // Fetch product details and image from Open Food Facts.
            const result = await lookupProductByBarcode(barcode);

            if (result) {
                setForm({
                    ...emptyForm,
                    name: result.name,
                    manufacturer: result.manufacturer,
                    barcode: result.barcode,
                    imageUrl: result.imageUrl,
                    category: result.category,
                });
            } else {
                // Barcode not found externally: allow manual entry.
                setForm({
                    ...emptyForm,
                    barcode,
                });

                alert(
                    "Product details were not found. You can enter the details manually."
                );
            }

            setEditingId(null);
            setShowForm(true);
        } catch (error) {
            console.error("Barcode lookup failed:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to retrieve product details."
            );
        } finally {
            setScanning(false);
        }
    }, []);

    const saveProduct = async () => {
        if (!form.name.trim()) {
            alert("Please enter product name.");
            return;
        }

        if (form.sellingPrice < 0 || form.minimumStock < 0) {
            alert("Price and minimum stock cannot be negative.");
            return;
        }

        const productData = {
            ...form,
            name: form.name.trim(),
            manufacturer: form.manufacturer.trim(),
            unit: form.unit || "Kg",
        };

        try {
            setSaving(true);

            if (editingId) {
                await updateProduct(editingId, productData);
            } else {
                await addProduct(productData);
            }

            setShowForm(false);
            setEditingId(null);
            setForm({ ...emptyForm });
            await loadProducts();
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Unable to save product.");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (product: Product) => {
        setMenuId(null);

        if (
            product.active &&
            !window.confirm(`Deactivate "${product.name}"?`)
        ) {
            return;
        }

        try {
            setSaving(true);

            if (product.active) {
                await deactivateProduct(product.id);
            } else {
                await reactivateProduct(product.id);
            }

            await loadProducts();
        } catch (error) {
            console.error("Failed to change product status:", error);
            alert("Unable to update product status.");
        } finally {
            setSaving(false);
        }
    };

    const removeProduct = async (product: Product) => {
        setMenuId(null);

        if (
            !window.confirm(
                `Permanently delete "${product.name}"? This cannot be undone.`
            )
        ) {
            return;
        }

        try {
            setSaving(true);
            await deleteProduct(product.id);
            await loadProducts();
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert("Unable to delete product.");
        } finally {
            setSaving(false);
        }
    };

    const getStockStatus = (product: Product) => {
        if (!product.active) {
            return {
                label: "Inactive",
                className: "bg-slate-100 text-slate-600",
            };
        }

        if (product.currentStock <= 0) {
            return {
                label: "Out of Stock",
                className: "bg-red-100 text-red-700",
            };
        }

        if (product.currentStock <= product.minimumStock) {
            return {
                label: "Low Stock",
                className: "bg-amber-100 text-amber-800",
            };
        }

        return {
            label: "In Stock",
            className: "bg-green-100 text-green-800",
        };
    };

    return (
        <div className="min-h-screen bg-[#f5f7fc] pb-24 text-[#101828]">

            {/* Mobile top navigation */}
            <header className="sticky top-0 z-30 border-b border-slate-100 bg-white">
                <div className="flex h-[58px] items-center justify-between px-4">
                    <button
                        type="button"
                        onClick={() => setShowNavigation(!showNavigation)}
                        className="rounded-lg p-2 text-[#172554]"
                        aria-label="Open navigation"
                    >
                        <Menu size={21} />
                    </button>

                    <h1 className="text-[17px] font-extrabold tracking-tight text-[#101828]">
                        Retail POS
                    </h1>

                    <button
                        type="button"
                        className="rounded-lg p-2 text-[#172554]"
                        aria-label="Shopping cart"
                    >
                        <ShoppingCart size={21} />
                    </button>
                </div>

                {showNavigation && (
                    <div className="absolute left-3 right-3 top-[54px] z-40 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                        <a href="/" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-blue-50">
                            <Home size={17} /> Home
                        </a>
                        <a href="/products" className="flex items-center gap-3 rounded-lg bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700">
                            <Box size={17} /> Products
                        </a>
                        <a href="/billing" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-blue-50">
                            <ClipboardList size={17} /> Billing
                        </a>
                    </div>
                )}
            </header>

            <main className="mx-auto max-w-xl space-y-4 px-3 pb-5 pt-4">

                {/* Products heading */}
                <section className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[21px] font-extrabold tracking-tight">
                            Products
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Manage your products
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">

                        {/* Scan Barcode Button */}
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            disabled={scanning}
                            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 active:scale-95"
                        >
                            <ScanBarcode size={17} />
                            Scan
                        </button>

                        {/* Add Product Button */}
                        <button
                            type="button"
                            onClick={openAddForm}
                            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#0866ed] px-3.5 text-xs font-bold text-white shadow-sm active:scale-95"
                        >
                            <Plus size={17} />
                            Add
                        </button>

                    </div>
                </section>

                {/* Search */}
                <section className="flex h-11 items-center gap-2 rounded-xl border border-[#dce4f2] bg-white px-3 shadow-sm">
                    <Search size={17} className="shrink-0 text-slate-500" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search products..."
                        className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                            className="text-slate-400"
                        >
                            <X size={16} />
                        </button>
                    )}
                </section>
                {/* Barcode Scanner */}
                {showScanner && (
                    <BarcodeScanner
                        onScan={handleBarcodeScan}
                        onClose={() => setShowScanner(false)}
                    />
                )}

                {/* Three compact mobile indicators from reference */}
                <section className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border border-blue-100 bg-[#edf4ff] px-2 py-2 text-center">
                        <Package size={16} className="mx-auto text-blue-600" />
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                            {totalProducts}
                        </p>
                        <p className="text-[9px] font-medium text-slate-600">
                            Total
                        </p>
                    </div>

                    <div className="rounded-lg border border-green-100 bg-[#edfaf3] px-2 py-2 text-center">
                        <Package size={16} className="mx-auto text-green-600" />
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                            {inStock}
                        </p>
                        <p className="text-[9px] font-medium text-slate-600">
                            In Stock
                        </p>
                    </div>

                    <div className="rounded-lg border border-orange-100 bg-[#fff6ed] px-2 py-2 text-center">
                        <Package size={16} className="mx-auto text-orange-500" />
                        <p className="mt-0.5 text-base font-bold text-slate-900">
                            {lowStock}
                        </p>
                        <p className="text-[9px] font-medium text-slate-600">
                            Low Stock
                        </p>
                    </div>
                </section>

                {/* Product list heading */}
                <section className="flex items-center justify-between pt-1">
                    <h3 className="text-sm font-bold text-slate-800">
                        All Products
                    </h3>
                    <span className="text-[11px] font-medium text-slate-500">
                        {filteredProducts.length} products
                    </span>
                </section>

                {/* Product list */}
                {loading ? (
                    <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
                        Loading products...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowScanner(true)}
                            disabled={scanning}
                            className="flex h-10 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 active:scale-95 disabled:opacity-50"
                        >
                            <ScanBarcode size={17} />
                            {scanning ? "Searching..." : "Scan"}
                        </button>

                        <button
                            type="button"
                            onClick={openAddForm}
                            className="flex h-10 items-center gap-1.5 rounded-lg bg-[#0866ed] px-3.5 text-xs font-bold text-white shadow-sm active:scale-95"
                        >
                            <Plus size={17} />
                            Add
                        </button>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-[#e5eaf2] bg-white">
                        {filteredProducts.map((product, index) => {
                            const status = getStockStatus(product);

                            return (
                                <article
                                    key={product.id}
                                    className={`relative flex min-h-[76px] items-center gap-3 px-3 py-3 ${index !== filteredProducts.length - 1
                                        ? "border-b border-slate-100"
                                        : ""
                                        }`}
                                >
                                    {/* Product image */}
                                    <div className="flex h-[48px] w-[43px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f1f4fa]">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                loading="lazy"
                                                className="h-full w-full object-contain"
                                                onError={(event) => {
                                                    event.currentTarget.style.display = "none";
                                                }}
                                            />
                                        ) : (
                                            <Package
                                                size={25}
                                                strokeWidth={1.6}
                                                className="text-[#2563eb]"
                                            />
                                        )}
                                    </div>

                                    {/* Product details */}
                                    <div className="min-w-0 flex-1">
                                        <h4 className="truncate text-[12px] font-bold text-slate-900">
                                            {product.name}
                                        </h4>

                                        <p className="mt-1 text-[11px] font-bold text-slate-800">
                                            ₹{product.sellingPrice.toLocaleString("en-IN")}
                                            <span className="ml-1 font-normal text-slate-500">
                                                · {product.currentStock} {product.unit} in stock
                                            </span>
                                        </p>
                                    </div>

                                    {/* Status */}
                                    <div className="flex shrink-0 items-center gap-1">
                                        <span className={`rounded-md px-2 py-1 text-[9px] font-bold ${status.className}`}>
                                            {status.label}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMenuId(
                                                    menuId === product.id ? null : product.id
                                                )
                                            }
                                            aria-label={`Actions for ${product.name}`}
                                            className="rounded-md p-1 text-slate-400"
                                        >

                                        </button>
                                    </div>

                                    {/* Action menu */}
                                    {menuId === product.id && (
                                        <div className="absolute right-3 top-12 z-20 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                                            <button
                                                type="button"
                                                onClick={() => openEditForm(product)}
                                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-xs hover:bg-blue-50"
                                            >
                                                <Pencil size={14} />
                                                Edit product
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void toggleActive(product)}
                                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-xs hover:bg-blue-50 disabled:opacity-50"
                                            >
                                                <Power size={14} />
                                                {product.active ? "Deactivate" : "Reactivate"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void removeProduct(product)}
                                                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-3 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <Trash2 size={14} />
                                                Delete product
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => openEditForm(product)}
                                        aria-label={`View ${product.name}`}
                                        className="absolute inset-y-0 right-0 w-1 opacity-0"
                                    >
                                        <ChevronRight size={1} />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Fixed bottom navigation */}
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
                <div className="mx-auto grid h-[58px] max-w-xl grid-cols-4">
                    <a href="/" className="flex flex-col items-center justify-center gap-1 text-slate-500">
                        <Home size={19} />
                        <span className="text-[10px] font-medium">Home</span>
                    </a>

                    <a href="/products" className="flex flex-col items-center justify-center gap-1 text-[#0866ed]">
                        <Box size={19} />
                        <span className="text-[10px] font-bold">Products</span>
                    </a>

                    <a href="/billing" className="flex flex-col items-center justify-center gap-1 text-slate-500">
                        <ClipboardList size={19} />
                        <span className="text-[10px] font-medium">Billing</span>
                    </a>

                    <button
                        type="button"
                        onClick={() => setShowNavigation(!showNavigation)}
                        className="flex flex-col items-center justify-center gap-1 text-slate-500"
                    >
                        <LayoutGrid size={19} />
                        <span className="text-[10px] font-medium">More</span>
                    </button>
                </div>
            </nav>


            {/* Add / Edit Product form */}
            {showForm && (
                <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#f5f7fc]">

                    {/* Form Header */}
                    <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"
                            aria-label="Go back"
                        >
                            <X size={19} />
                        </button>

                        <div className="flex-1">
                            <h2 className="text-[16px] font-bold text-slate-900">
                                {editingId ? "Edit Product" : "Add Product"}
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Add and manage product information
                            </p>
                        </div>
                    </header>

                    {/* Scrollable Form */}
                    <section className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-5">
                        <form
                            id="product-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void saveProduct();
                            }}
                            className="space-y-4"
                        >
                            {/* Product Information */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-4 flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                        <Package size={17} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                            Product Information
                                        </h3>
                                        <p className="text-[10px] text-slate-500">
                                            Basic details about your product
                                        </p>
                                    </div>
                                </div>

                                {/* Product Name */}
                                <div className="mb-3">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Product Name *
                                    </label>
                                    <input
                                        required
                                        value={form.name}
                                        onChange={(event) =>
                                            setForm({ ...form, name: event.target.value })
                                        }
                                        placeholder="e.g. Maggi Noodles"
                                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                                    />
                                </div>

                                {/* Category */}
                                <div className="mb-3">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Category *
                                    </label>
                                    <select
                                        value={form.category}
                                        onChange={(event) =>
                                            setForm({ ...form, category: event.target.value })
                                        }
                                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                    >
                                        {categories.map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Manufacturer */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Brand / Manufacturer
                                    </label>
                                    <input
                                        value={form.manufacturer}
                                        onChange={(event) =>
                                            setForm({ ...form, manufacturer: event.target.value })
                                        }
                                        placeholder="e.g. Nestle"
                                        className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Barcode
                                </label>

                                <input
                                    value={form.barcode}
                                    onChange={(event) =>
                                        setForm({ ...form, barcode: event.target.value })
                                    }
                                    placeholder="Scan or enter barcode"
                                    className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                />
                            </div>
                            {form.imageUrl && (
                                <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                    <img
                                        src={form.imageUrl}
                                        alt={form.name || "Product"}
                                        className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain"
                                        onError={(event) => {
                                            event.currentTarget.style.display = "none";
                                        }}
                                    />

                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-slate-800">
                                            Product image found
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            Retrieved from product database
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Pricing and Stock */}
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Pricing & Inventory
                                    </h3>
                                    <p className="text-[10px] text-slate-500">
                                        Set selling price and stock settings
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Selling Price */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                            Selling Price (₹) *
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.sellingPrice}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    sellingPrice: Number(event.target.value),
                                                })
                                            }
                                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Current Stock */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                            Current Stock *
                                        </label>
                                        <input
                                            required
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={form.currentStock}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    currentStock: Number(event.target.value),
                                                })
                                            }
                                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Minimum Stock */}
                                    <div>
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                            Minimum Stock
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.minimumStock}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    minimumStock: Number(event.target.value),
                                                })
                                            }
                                            className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </div>

                                {/* Stock Unit */}
                                <div className="mt-3">
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                        Stock Unit
                                    </label>
                                    <select
                                        value={form.unit}
                                        onChange={(event) =>
                                            setForm({ ...form, unit: event.target.value })
                                        }
                                        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                                    >
                                        {[
                                            "Pcs", "Kg", "Gram", "Litre", "ML",
                                            "Packet", "Box", "Dozen", "Bottle",
                                            "Pair", "Set", "Pack",
                                        ].map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </form>
                    </section>

                    {/* Fixed Bottom Actions */}
                    <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
                        <div className="mx-auto flex max-w-xl gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                disabled={saving}
                                className="h-11 flex-1 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                form="product-form"
                                disabled={saving}
                                className="h-11 flex-[1.5] rounded-lg bg-[#0866ed] text-sm font-bold text-white shadow-sm disabled:opacity-60"
                            >
                                {saving
                                    ? "Saving..."
                                    : editingId
                                        ? "Update Product"
                                        : "Save Product"}
                            </button>
                        </div>
                    </footer>
                </div>
            )}
        </div>
    );
}
export default ProductsMobile;
