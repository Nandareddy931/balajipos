
import { useEffect, useMemo, useState } from "react";
import {
    Plus, Search, Package, Pencil, Power, X, Filter,
    Boxes, AlertTriangle, CheckCircle2, Layers3, ChevronDown,
    Barcode, Tag, IndianRupee, Truck, FileText, Camera,
} from "lucide-react";

import BarcodeScanner from "../components/BarcodeScanner";
import { lookupProductByBarcode } from "../services/barcodeService";

import {
    getProducts,
    addProduct,
    updateProduct,
    deactivateProduct,
    reactivateProduct,
    deleteProduct,
    findProductByBarcode,
    type Product,
} from "../services/productService";

// ==========================================
// RETAIL PRODUCT CATEGORIES
// ==========================================

const CATEGORY_OPTIONS = [
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

const UNIT_OPTIONS = [
    "Pcs", "Kg", "Gram", "Litre", "ML",
    "Packet", "Box", "Dozen", "Bottle",
    "Pair", "Set", "Pack",
];

const GST_OPTIONS = [0, 5, 12, 18, 28];

const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

const labelClass =
    "mb-1.5 block text-[11px] font-semibold text-slate-600";

const initialForm = {
    name: "",
    category: "Grocery & Provisions",
    sku: "",
    barcode: "",
    manufacturer: "",
    imageUrl: "",
    unit: "Pcs",
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    gstRate: 0,
    minimumStock: 0,
    supplier: "",
    description: "",
};

// ==========================================
// REUSABLE PRODUCT IMAGE
// ==========================================

function ProductImage({
    src,
    alt,
    className = "",
}: {
    src?: string;
    alt: string;
    className?: string;
}) {
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [src]);

    return (
        <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-green-50 ${className}`}
        >
            {src && !imageError ? (
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onError={() => setImageError(true)}
                    className="h-full w-full object-contain"
                />
            ) : (
                <Package className="h-5 w-5 text-green-700" />
            )}
        </div>
    );
}

// ==========================================
// PRODUCTS PAGE
// ==========================================

function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showForm, setShowForm] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(initialForm);

    const [showScanner, setShowScanner] = useState(false);
    const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);

    // ==========================================
    // RESET FORM
    // ==========================================

    const resetForm = () => {
        setForm({ ...initialForm });
        setEditingProductId(null);
        setShowForm(false);
        setShowScanner(false);
        setBarcodeLookupLoading(false);
    };

    // ==========================================
    // LOAD PRODUCTS
    // ==========================================

    const loadProducts = async () => {
        try {
            setLoading(true);
            const result = await getProducts();
            setProducts(result);
        } catch (error) {
            console.error("Failed to load products:", error);
            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to load products."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    // ==========================================
    // CATEGORY AND STOCK SUMMARY
    // ==========================================

    const categories = useMemo(() => {
        const existing = products
            .map(p => p.category?.trim())
            .filter((c): c is string => Boolean(c));

        return ["All", ...Array.from(new Set(existing)).sort()];
    }, [products]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        products.forEach(p => {
            const category = p.category || "Other";
            counts[category] = (counts[category] || 0) + 1;
        });

        return counts;
    }, [products]);

    const activeProducts = products.filter(p => p.active);

    const lowStockProducts = activeProducts.filter(
        p => p.currentStock <= p.minimumStock
    );

    // ==========================================
    // SEARCH AND FILTER
    // ==========================================

    const filteredProducts = useMemo(() => {
        const term = search.toLowerCase().trim();

        return products.filter(product => {
            const matchesSearch =
                product.name?.toLowerCase().includes(term) ||
                product.category?.toLowerCase().includes(term) ||
                product.sku?.toLowerCase().includes(term) ||
                product.barcode?.toLowerCase().includes(term) ||
                product.supplier?.toLowerCase().includes(term) ||
                product.manufacturer?.toLowerCase().includes(term);

            const matchesCategory =
                selectedCategory === "All" ||
                product.category === selectedCategory;

            const lowStock =
                product.currentStock <= product.minimumStock;

            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Active" && product.active) ||
                (statusFilter === "Low Stock" && product.active && lowStock) ||
                (statusFilter === "Inactive" && !product.active);

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [products, search, selectedCategory, statusFilter]);

    // ==========================================
    // HELPERS
    // ==========================================

    const formatPrice = (price?: number) =>
        `₹${(Number(price) || 0).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        })}`;

    const updateField = (
        field: keyof typeof initialForm,
        value: string | number
    ) => {
        setForm(current => ({
            ...current,
            [field]: value,
        }));
    };

    // ==========================================
    // DESKTOP BARCODE SCANNER
    // ==========================================

    const handleScannedBarcode = async (barcode: string) => {
        const scannedCode = barcode.trim().replace(/\s/g, "");

        if (!scannedCode || barcodeLookupLoading) return;

        try {
            setBarcodeLookupLoading(true);

            // Check whether barcode already belongs to another product.
            const existingProduct = await findProductByBarcode(scannedCode);

            if (
                existingProduct &&
                existingProduct.id !== editingProductId
            ) {
                alert(
                    `This barcode is already assigned to "${existingProduct.name}".`
                );
                return;
            }

            // Immediately display the scanned barcode.
            setForm(current => ({
                ...current,
                barcode: scannedCode,
            }));

            // Retrieve product details from Open Food Facts.
            const scannedProduct =
                await lookupProductByBarcode(scannedCode);

            if (!scannedProduct) {
                alert(
                    "Barcode scanned successfully, but product details were not found. Please enter the details manually."
                );
                return;
            }

            setForm(current => ({
                ...current,
                barcode: scannedProduct.barcode,
                name: current.name || scannedProduct.name,
                manufacturer:
                    current.manufacturer || scannedProduct.manufacturer,
                category:
                    current.category === "Grocery & Provisions"
                        ? scannedProduct.category
                        : current.category,
                imageUrl:
                    scannedProduct.imageUrl || current.imageUrl,
                description:
                    current.description || scannedProduct.description,
            }));

            alert("Product details retrieved successfully.");
        } catch (error) {
            console.error("Barcode lookup failed:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to retrieve product details."
            );
        } finally {
            setBarcodeLookupLoading(false);
        }
    };

    // ==========================================
    // SAVE / UPDATE PRODUCT
    // ==========================================

    const handleSaveProduct = async () => {
        if (!form.name.trim()) {
            alert("Please enter product name.");
            return;
        }

        if (!form.category.trim()) {
            alert("Please select a product category.");
            return;
        }

        if (
            form.sellingPrice < 0 ||
            form.purchasePrice < 0 ||
            form.mrp < 0 ||
            form.minimumStock < 0
        ) {
            alert("Prices and minimum stock cannot be negative.");
            return;
        }

        if (form.gstRate < 0 || form.gstRate > 100) {
            alert("Please enter a valid GST rate.");
            return;
        }

        if (form.mrp > 0 && form.sellingPrice > form.mrp) {
            alert("Selling price should not be greater than MRP.");
            return;
        }

        try {
            setLoading(true);

            const productData = {
                name: form.name.trim(),
                category: form.category,
                sku: form.sku.trim().toUpperCase(),
                barcode: form.barcode.trim(),
                manufacturer: form.manufacturer.trim(),
                imageUrl: form.imageUrl.trim(),
                unit: form.unit || "Pcs",
                purchasePrice: Number(form.purchasePrice),
                sellingPrice: Number(form.sellingPrice),
                mrp: Number(form.mrp),
                gstRate: Number(form.gstRate),
                minimumStock: Number(form.minimumStock),
                supplier: form.supplier.trim(),
                description: form.description.trim(),
            };

            if (editingProductId) {
                await updateProduct(editingProductId, productData);

                setProducts(current =>
                    current.map(p =>
                        p.id === editingProductId
                            ? { ...p, ...productData }
                            : p
                    )
                );

                alert("Product updated successfully.");
            } else {
                const productId = await addProduct(productData);

                setProducts(current => [
                    ...current,
                    {
                        id: productId,
                        ...productData,
                        currentStock: 0,
                        active: true,
                    },
                ]);

                alert("Product added successfully.");
            }

            resetForm();
        } catch (error) {
            console.error("Failed to save product:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Unable to save product."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // EDIT PRODUCT
    // ==========================================

    const startEdit = (product: Product) => {
        setForm({
            name: product.name || "",
            category: product.category || "Other",
            sku: product.sku || "",
            barcode: product.barcode || "",
            manufacturer: product.manufacturer || "",
            imageUrl: product.imageUrl || "",
            unit: product.unit || "Pcs",
            purchasePrice: product.purchasePrice ?? 0,
            sellingPrice: product.sellingPrice ?? 0,
            mrp: product.mrp ?? 0,
            gstRate: product.gstRate ?? 0,
            minimumStock: product.minimumStock ?? 0,
            supplier: product.supplier || "",
            description: product.description || "",
        });

        setEditingProductId(product.id);
        setShowScanner(false);
        setShowForm(true);
    };

    // ==========================================
    // DEACTIVATE PRODUCT
    // ==========================================

    const handleDeactivate = async (product: Product) => {
        if (!window.confirm(
            `Deactivate "${product.name}"?\n\nExisting stock and bills will remain safe.`
        )) return;

        try {
            setLoading(true);
            await deactivateProduct(product.id);

            setProducts(current =>
                current.map(p =>
                    p.id === product.id ? { ...p, active: false } : p
                )
            );

            alert("Product deactivated successfully.");
        } catch (error) {
            console.error(error);
            alert("Unable to deactivate product.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // REACTIVATE PRODUCT
    // ==========================================

    const handleReactivate = async (product: Product) => {
        try {
            setLoading(true);
            await reactivateProduct(product.id);

            setProducts(current =>
                current.map(p =>
                    p.id === product.id ? { ...p, active: true } : p
                )
            );

            alert("Product reactivated successfully.");
        } catch (error) {
            console.error(error);
            alert("Unable to reactivate product.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // DELETE PRODUCT
    // ==========================================

    const handleDeleteProduct = async (product: Product) => {
        if (!window.confirm(
            `Permanently delete "${product.name}"? This action cannot be undone.`
        )) return;

        try {
            setLoading(true);
            await deleteProduct(product.id);

            setProducts(current =>
                current.filter(p => p.id !== product.id)
            );

            alert("Product deleted successfully.");
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Unable to delete product.");
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // PRODUCT STATUS
    // ==========================================

    const ProductStatus = ({ product }: { product: Product }) => {
        if (!product.active) {
            return (
                <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Inactive
                </span>
            );
        }

        if (product.currentStock <= product.minimumStock) {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    <AlertTriangle className="h-3 w-3" />
                    Low Stock
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                In Stock
            </span>
        );
    };

    // ==========================================
    // PRODUCT ACTIONS
    // ==========================================

    const ProductActions = ({ product }: { product: Product }) => (
        <div className="flex items-center gap-1.5">
            <button
                type="button"
                onClick={() => startEdit(product)}
                disabled={loading}
                title="Edit product"
                className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:border-green-300 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
            >
                <Pencil className="h-3.5 w-3.5" />
            </button>

            <button
                type="button"
                onClick={() =>
                    product.active
                        ? handleDeactivate(product)
                        : handleReactivate(product)
                }
                disabled={loading}
                title={product.active ? "Deactivate product" : "Reactivate product"}
                className={`rounded-md border p-1.5 disabled:opacity-50 ${product.active
                    ? "border-red-100 text-red-500 hover:bg-red-50"
                    : "border-green-100 text-green-600 hover:bg-green-50"
                    }`}
            >
                <Power className="h-3.5 w-3.5" />
            </button>
        </div>
    );

    // ==========================================
    // PAGE UI
    // ==========================================

    return (
        <div className="flex min-h-0 flex-col bg-[#f5f8f6] text-slate-800">

            {/* PAGE HEADER */}
            <header className="shrink-0 border-b border-green-100 bg-white">
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="rounded-lg bg-green-100 p-2">
                            <Package className="h-5 w-5 text-green-700" />
                        </div>

                        <div className="min-w-0">
                            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-green-700">
                                New Balaji Ruthu Depo
                            </p>
                            <h1 className="text-lg font-bold leading-tight text-slate-900">
                                Products
                            </h1>
                            <p className="hidden text-[11px] text-slate-500 sm:block">
                                Manage products, pricing and stock levels
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (showForm) {
                                resetForm();
                            } else {
                                setEditingProductId(null);
                                setForm({ ...initialForm });
                                setShowScanner(false);
                                setShowForm(true);
                            }
                        }}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-green-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-800"
                    >
                        {showForm
                            ? <X className="h-3.5 w-3.5" />
                            : <Plus className="h-3.5 w-3.5" />}
                        {showForm ? "Close" : "Add Product"}
                    </button>
                </div>
            </header>

            <main className="mx-auto w-full max-w-[1600px] space-y-3 p-3 sm:p-4">

                {/* SUMMARY CARDS */}
                <section className="hidden grid-cols-4 gap-3 lg:grid">
                    {[
                        {
                            label: "Total Products",
                            value: products.length,
                            note: "All registered products",
                            icon: Package,
                            style: "bg-green-50 text-green-700",
                        },
                        {
                            label: "Active Products",
                            value: activeProducts.length,
                            note: "Available for sale",
                            icon: CheckCircle2,
                            style: "bg-blue-50 text-blue-600",
                        },
                        {
                            label: "Low Stock",
                            value: lowStockProducts.length,
                            note: "Need restocking",
                            icon: AlertTriangle,
                            style: "bg-red-50 text-red-600",
                        },
                        {
                            label: "Categories",
                            value: categories.length - 1,
                            note: "Product categories",
                            icon: Layers3,
                            style: "bg-amber-50 text-amber-600",
                        },
                    ].map(item => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={item.label}
                                className="flex items-center justify-between rounded-xl border border-green-100 bg-white px-4 py-3 shadow-sm"
                            >
                                <div>
                                    <p className="text-[11px] font-medium text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-0.5 text-xl font-bold text-slate-900">
                                        {item.value}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                        {item.note}
                                    </p>
                                </div>
                                <div className={`rounded-lg p-2.5 ${item.style}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* ADD / EDIT PRODUCT FORM */}
                {showForm && (
                    <section className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">

                        {/* FORM HEADER */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-[#f8fbf9] px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-lg bg-green-100 p-2">
                                    <Package className="h-4 w-4 text-green-700" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        {editingProductId ? "Edit Product" : "Create New Product"}
                                    </h2>
                                    <p className="text-[10px] text-slate-500">
                                        Enter product details, pricing and inventory settings
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="grid gap-4 p-4 xl:grid-cols-[1fr_270px]">

                            {/* LEFT FORM */}
                            <div className="space-y-4">

                                {/* BASIC INFORMATION */}
                                <div>
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="h-5 w-1 rounded-full bg-green-600" />
                                        <h3 className="text-xs font-bold text-slate-800">
                                            Basic Information
                                        </h3>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Product Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                autoFocus
                                                value={form.name}
                                                onChange={e => updateField("name", e.target.value)}
                                                placeholder="e.g. Parle-G Biscuits 100g"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Product Category <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={form.category}
                                                onChange={e => updateField("category", e.target.value)}
                                                className={inputClass}
                                            >
                                                {Array.from(new Set([
                                                    ...CATEGORY_OPTIONS,
                                                    ...categories.filter(c => c !== "All"),
                                                ])).map(category => (
                                                    <option key={category} value={category}>
                                                        {category}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Manufacturer / Brand
                                            </label>
                                            <input
                                                value={form.manufacturer}
                                                onChange={e => updateField("manufacturer", e.target.value)}
                                                placeholder="e.g. Nestlé"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                SKU / Product Code
                                            </label>
                                            <div className="relative">
                                                <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={form.sku}
                                                    onChange={e => updateField("sku", e.target.value)}
                                                    placeholder="e.g. GRC-001"
                                                    className={`${inputClass} pl-9`}
                                                />
                                            </div>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>Barcode</label>

                                            <div className="flex items-center gap-2">
                                                <div className="relative min-w-0 flex-1">
                                                    <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-700" />

                                                    <input
                                                        type="text"
                                                        value={form.barcode}
                                                        onChange={(e) => updateField("barcode", e.target.value)}
                                                        placeholder="Enter barcode number"
                                                        className={`${inputClass} pl-9`}
                                                    />
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowScanner(true)}
                                                    className="flex h-10 shrink-0 items-center gap-2 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white hover:bg-green-800"
                                                >
                                                    <Camera className="h-4 w-4" />
                                                    Scan
                                                </button>
                                            </div>

                                            {showScanner && (
                                                <div className="mt-3 w-full">
                                                    <BarcodeScanner
                                                        onScan={handleScannedBarcode}
                                                        onClose={() => setShowScanner(false)}
                                                    />
                                                </div>
                                            )}

                                            {barcodeLookupLoading && (
                                                <p className="mt-2 text-xs text-green-700">
                                                    Looking up product details...
                                                </p>
                                            )}
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className={labelClass}>
                                                Product Image URL
                                            </label>
                                            <input
                                                value={form.imageUrl}
                                                onChange={e => updateField("imageUrl", e.target.value)}
                                                placeholder="Product image URL (automatically filled when available)"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PRICING */}
                                <div className="border-t border-slate-100 pt-3">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="h-5 w-1 rounded-full bg-green-600" />
                                        <h3 className="text-xs font-bold text-slate-800">
                                            Product Pricing
                                        </h3>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {[
                                            {
                                                label: "Purchase Price",
                                                field: "purchasePrice" as const,
                                                placeholder: "Buying price",
                                            },
                                            {
                                                label: "Selling Price",
                                                field: "sellingPrice" as const,
                                                placeholder: "Selling price",
                                            },
                                            {
                                                label: "MRP",
                                                field: "mrp" as const,
                                                placeholder: "Maximum retail price",
                                            },
                                        ].map(item => (
                                            <div key={item.field}>
                                                <label className={labelClass}>
                                                    {item.label}
                                                    {item.field === "sellingPrice" && (
                                                        <span className="text-red-500"> *</span>
                                                    )}
                                                </label>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={form[item.field]}
                                                        onChange={e =>
                                                            updateField(item.field, Number(e.target.value))
                                                        }
                                                        placeholder={item.placeholder}
                                                        className={`${inputClass} pl-8`}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>
                                                GST Rate
                                            </label>
                                            <select
                                                value={form.gstRate}
                                                onChange={e => updateField("gstRate", Number(e.target.value))}
                                                className={inputClass}
                                            >
                                                {GST_OPTIONS.map(rate => (
                                                    <option key={rate} value={rate}>
                                                        {rate}% GST
                                                    </option>
                                                ))}
                                                {!GST_OPTIONS.includes(form.gstRate) && (
                                                    <option value={form.gstRate}>
                                                        {form.gstRate}% GST
                                                    </option>
                                                )}
                                            </select>
                                        </div>

                                        <div className="flex items-end">
                                            <div className="w-full rounded-lg border border-green-100 bg-green-50/60 px-3 py-2">
                                                <p className="text-[10px] font-medium text-green-700">
                                                    Profit per unit (before tax/other costs)
                                                </p>
                                                <p className="mt-0.5 text-sm font-bold text-green-800">
                                                    {formatPrice(form.sellingPrice - form.purchasePrice)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* INVENTORY SETTINGS */}
                                <div className="border-t border-slate-100 pt-3">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="h-5 w-1 rounded-full bg-green-600" />
                                        <h3 className="text-xs font-bold text-slate-800">
                                            Inventory Settings
                                        </h3>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>
                                                Selling Unit
                                            </label>
                                            <select
                                                value={form.unit}
                                                onChange={e => updateField("unit", e.target.value)}
                                                className={inputClass}
                                            >
                                                {UNIT_OPTIONS.map(unit => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Minimum Stock Alert
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={form.minimumStock}
                                                onChange={e =>
                                                    updateField("minimumStock", Number(e.target.value))
                                                }
                                                placeholder="e.g. 10"
                                                className={inputClass}
                                            />
                                            <p className="mt-1 text-[9px] text-slate-400">
                                                Alert when stock reaches this quantity.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* SUPPLIER AND DESCRIPTION */}
                                <div className="border-t border-slate-100 pt-3">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="h-5 w-1 rounded-full bg-green-600" />
                                        <h3 className="text-xs font-bold text-slate-800">
                                            Additional Details
                                        </h3>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <label className={labelClass}>
                                                Default Supplier
                                            </label>
                                            <div className="relative">
                                                <Truck className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={form.supplier}
                                                    onChange={e => updateField("supplier", e.target.value)}
                                                    placeholder="Supplier name"
                                                    className={`${inputClass} pl-9`}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={labelClass}>
                                                Product Description
                                            </label>
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                                <input
                                                    value={form.description}
                                                    onChange={e => updateField("description", e.target.value)}
                                                    placeholder="Optional product details"
                                                    className={`${inputClass} pl-9`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT PRODUCT PREVIEW */}
                            <aside className="h-fit rounded-xl border border-green-100 bg-[#f7faf8] p-3">
                                <h3 className="text-xs font-bold text-slate-800">
                                    Product Preview
                                </h3>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                    Review the details before saving.
                                </p>

                                <div className="mt-4 flex h-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-green-200 bg-white">
                                    <ProductImage
                                        src={form.imageUrl}
                                        alt={form.name || "Product preview"}
                                        className="h-full w-full rounded-none bg-white"
                                    />
                                </div>

                                <div className="mt-3 space-y-3">
                                    <div>
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            Product Name
                                        </p>
                                        <p className="mt-0.5 break-words text-xs font-bold text-slate-800">
                                            {form.name || "New product"}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500">Brand</span>
                                        <span className="max-w-[150px] truncate text-[10px] font-semibold text-slate-700">
                                            {form.manufacturer || "Not assigned"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500">Category</span>
                                        <span className="max-w-[150px] truncate rounded-md bg-green-100 px-2 py-1 text-[9px] font-semibold text-green-800">
                                            {form.category}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500">SKU</span>
                                        <span className="max-w-[150px] truncate text-[10px] font-semibold text-slate-700">
                                            {form.sku || "Not assigned"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500">Barcode</span>
                                        <span className="max-w-[150px] truncate text-[10px] font-semibold text-slate-700">
                                            {form.barcode || "Not assigned"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-[10px] text-slate-500">Unit</span>
                                        <span className="text-[10px] font-semibold text-slate-700">
                                            {form.unit}
                                        </span>
                                    </div>

                                    <div className="border-t border-green-100 pt-3">
                                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                                            Selling Price
                                        </p>
                                        <p className="mt-1 text-2xl font-bold text-green-800">
                                            {formatPrice(form.sellingPrice)}
                                        </p>
                                    </div>

                                    <div className="space-y-2 rounded-lg bg-white p-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500">
                                                Purchase Price
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-800">
                                                {formatPrice(form.purchasePrice)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500">
                                                MRP
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-800">
                                                {formatPrice(form.mrp)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500">
                                                GST
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-800">
                                                {form.gstRate}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500">
                                                Minimum Stock
                                            </span>
                                            <span className="text-[10px] font-semibold text-slate-800">
                                                {form.minimumStock} {form.unit}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </aside>
                        </div>

                        {/* FORM ACTIONS */}
                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-[#fbfdfb] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                {editingProductId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const product = products.find(
                                                p => p.id === editingProductId
                                            );
                                            if (product) handleDeleteProduct(product);
                                        }}
                                        disabled={loading}
                                        className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
                                    >
                                        Delete Product
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    disabled={loading}
                                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:flex-none"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveProduct}
                                    disabled={loading || barcodeLookupLoading}
                                    className="flex-1 rounded-lg bg-green-700 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-800 disabled:opacity-50 sm:flex-none"
                                >
                                    {loading
                                        ? "Saving..."
                                        : editingProductId
                                            ? "Update Product"
                                            : "Save Product"}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                {/* PRODUCT CATALOGUE */}
                <section className="overflow-hidden rounded-xl border border-green-100 bg-white shadow-sm">

                    {/* SEARCH AND FILTERS */}
                    <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">
                                        Product Catalogue
                                    </h2>
                                    <p className="text-[10px] text-slate-500">
                                        {filteredProducts.length} products displayed
                                    </p>
                                </div>
                                <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-800 lg:hidden">
                                    {products.length} Total
                                </span>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                                <div className="relative min-w-0 flex-1 lg:w-72 lg:flex-none">
                                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search name, SKU, barcode or supplier..."
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-100"
                                    />
                                </div>

                                <div className="relative sm:w-40">
                                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={e => setStatusFilter(e.target.value)}
                                        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-600 outline-none focus:border-green-500"
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Active">Active</option>
                                        <option value="Low Stock">Low Stock</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        {/* CATEGORY FILTERS */}
                        <div className="mt-3 flex items-center gap-2">
                            <Layers3 className="h-3.5 w-3.5 shrink-0 text-green-700" />
                            <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1">
                                {categories.map(category => {
                                    const selected = selectedCategory === category;
                                    const count = category === "All"
                                        ? products.length
                                        : categoryCounts[category] || 0;

                                    return (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => setSelectedCategory(category)}
                                            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition ${selected
                                                ? "border-green-700 bg-green-700 text-white"
                                                : "border-slate-200 bg-white text-slate-600 hover:border-green-300 hover:bg-green-50"
                                                }`}
                                        >
                                            {category}
                                            <span className={`rounded-full px-1 py-0.5 text-[9px] ${selected
                                                ? "bg-white/20 text-white"
                                                : "bg-slate-100 text-slate-500"
                                                }`}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* DESKTOP TABLE */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[900px] text-left text-xs">
                            <thead className="bg-[#f7faf8]">
                                <tr className="border-b border-slate-100">
                                    {[
                                        "Product",
                                        "Category",
                                        "SKU / Barcode",
                                        "Current Stock",
                                        "Selling Price",
                                        "Status",
                                        "Actions",
                                    ].map(heading => (
                                        <th
                                            key={heading}
                                            className="whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"
                                        >
                                            {heading}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map(product => (
                                    <tr
                                        key={product.id}
                                        className={`transition hover:bg-green-50/40 ${!product.active ? "bg-slate-50/70" : ""
                                            }`}
                                    >
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <ProductImage
                                                    src={product.imageUrl}
                                                    alt={product.name}
                                                    className="h-9 w-9"
                                                />
                                                <div className="min-w-0">
                                                    <p className="max-w-[220px] truncate text-xs font-semibold text-slate-800">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400">
                                                        {product.manufacturer || product.unit || "Pcs"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-3 py-2">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                                                {product.category}
                                            </span>
                                        </td>

                                        <td className="px-3 py-2">
                                            <p className="text-[10px] font-semibold text-slate-700">
                                                {product.sku || "—"}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {product.barcode || "No barcode"}
                                            </p>
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-2">
                                            <span className="font-bold text-slate-800">
                                                {product.currentStock}
                                            </span>
                                            <span className="ml-1 text-[10px] text-slate-400">
                                                {product.unit || ""}
                                            </span>
                                        </td>

                                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-700">
                                            {formatPrice(product.sellingPrice)}
                                        </td>

                                        <td className="px-3 py-2">
                                            <ProductStatus product={product} />
                                        </td>

                                        <td className="px-3 py-2">
                                            <ProductActions product={product} />
                                        </td>
                                    </tr>
                                ))}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center">
                                            <Package className="mx-auto h-8 w-8 text-slate-300" />
                                            <p className="mt-2 text-xs font-semibold text-slate-700">
                                                No products found
                                            </p>
                                            <p className="mt-1 text-[10px] text-slate-400">
                                                Try another search or category.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE PRODUCT CARDS */}
                    <div className="divide-y divide-slate-100 md:hidden">
                        {filteredProducts.map(product => (
                            <article key={product.id} className="p-3">
                                <div className="flex items-start gap-2.5">
                                    <ProductImage
                                        src={product.imageUrl}
                                        alt={product.name}
                                        className="h-11 w-11"
                                    />

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-xs font-bold text-slate-900">
                                                    {product.name}
                                                </h3>
                                                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                                                    SKU: {product.sku || "Not assigned"}
                                                </p>
                                            </div>
                                            <ProductStatus product={product} />
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="rounded bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-800">
                                                {product.category}
                                            </span>
                                            <span className="rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                                                {product.unit || "Pcs"}
                                            </span>
                                            {product.barcode && (
                                                <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] text-blue-700">
                                                    <Barcode className="h-3 w-3" />
                                                    {product.barcode}
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2.5 flex items-end justify-between gap-2">
                                            <div className="flex gap-5">
                                                <div>
                                                    <p className="text-[9px] font-semibold uppercase text-slate-400">
                                                        Selling Price
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-900">
                                                        {formatPrice(product.sellingPrice)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-semibold uppercase text-slate-400">
                                                        Stock Available
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-900">
                                                        {product.currentStock}
                                                    </p>
                                                </div>
                                            </div>
                                            <ProductActions product={product} />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}

                        {filteredProducts.length === 0 && (
                            <div className="px-4 py-10 text-center">
                                <Package className="mx-auto h-8 w-8 text-slate-300" />
                                <p className="mt-2 text-xs font-semibold text-slate-700">
                                    No products found
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                    Try another search or category.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-[#fbfdfb] px-3 py-2 text-[10px] text-slate-500">
                        <span>
                            Showing{" "}
                            <strong className="text-slate-700">
                                {filteredProducts.length}
                            </strong>{" "}
                            of{" "}
                            <strong className="text-slate-700">
                                {products.length}
                            </strong>{" "}
                            products
                        </span>
                        <span className="flex items-center gap-1">
                            <Boxes className="h-3 w-3 text-green-700" />
                            Inventory Catalogue
                        </span>
                    </div>
                </section>

                {loading && (
                    <p className="text-center text-[10px] text-slate-400">
                        Processing...
                    </p>
                )}
            </main>
        </div>
    );
}

export default Products;
