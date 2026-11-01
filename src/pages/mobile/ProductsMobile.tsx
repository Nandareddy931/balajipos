import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Package,
    MoreVertical,
    Pencil,
    Power,
    Trash2,
    X,
    SlidersHorizontal,
} from "lucide-react";

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
    "All",
    "Pesticide",
    "Insecticide",
    "Fungicide",
    "Herbicide",
    "Fertilizer",
    "Seed",
];

const emptyForm = {
    name: "",
    category: "Pesticide",
    manufacturer: "",
    unit: "Kg",
    sellingPrice: 0,
    minimumStock: 0,
};

type ProductForm = typeof emptyForm;

function ProductsMobile() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
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
            unit: product.unit || "Kg",
            sellingPrice: product.sellingPrice,
            minimumStock: product.minimumStock,
        });
        setShowForm(true);
        setMenuId(null);
    };

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

        try {
            setSaving(true);

            if (product.active) {
                if (!window.confirm(`Deactivate "${product.name}"?`)) return;
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
                `Permanently delete "${product.name}"? This cannot be undone.`,
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
        <div className="min-h-screen bg-[#f4f8f5] pb-28 text-slate-800">
            {/* Page heading */}
            <header className="bg-[#087443] px-4 pb-4 pt-3 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Products / Inventory</h1>
                        <p className="mt-0.5 text-[11px] text-green-100">
                            Manage your products and stock
                        </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                        <Package size={21} />
                    </div>
                </div>
            </header>

            <main className="space-y-3 px-3 pb-5 pt-3">
                {/* Search */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
                    <Search size={17} className="shrink-0 text-slate-400" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search products..."
                        className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
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
                </div>

                {/* Category chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <SlidersHorizontal
                        size={16}
                        className="shrink-0 text-slate-500"
                    />

                    {categories.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setCategory(item)}
                            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${category === item
                                ? "border-[#087443] bg-[#087443] text-white"
                                : "border-slate-200 bg-white text-slate-600"
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>

                {/* Results count */}
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">
                            All Products
                        </h2>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                            {filteredProducts.length} products found
                        </p>
                    </div>
                    <span className="rounded-lg bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-800">
                        Inventory
                    </span>
                </div>

                {/* Product cards */}
                {loading ? (
                    <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-sm text-slate-500">
                        Loading products...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="rounded-xl border border-slate-100 bg-white px-5 py-10 text-center">
                        <Package className="mx-auto mb-2 text-slate-300" size={34} />
                        <p className="text-sm font-semibold">No products found</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Try another search or add a product.
                        </p>
                        <button
                            type="button"
                            onClick={openAddForm}
                            className="mt-4 rounded-lg bg-[#087443] px-4 py-2 text-sm font-semibold text-white"
                        >
                            Add Product
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {filteredProducts.map((product) => {
                            const status = getStockStatus(product);

                            return (
                                <article
                                    key={product.id}
                                    className="relative rounded-xl border border-[#e1ece5] bg-white p-3 shadow-[0_1px_3px_rgba(20,60,35,0.05)]"
                                >
                                    <div className="flex gap-3">
                                        {/* Product image placeholder */}
                                        <div className="flex h-[66px] w-[58px] shrink-0 items-center justify-center rounded-lg border border-green-50 bg-[#f1f8f2]">
                                            <Package size={29} strokeWidth={1.5} className="text-[#258253]" />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2 pr-6">
                                                <h3 className="line-clamp-2 text-[13px] font-bold leading-5 text-slate-800">
                                                    {product.name}
                                                </h3>

                                                <span
                                                    className={`shrink-0 rounded-md px-2 py-1 text-[9px] font-bold ${status.className}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </div>

                                            <p className="mt-0.5 truncate text-[10px] text-slate-500">
                                                {product.manufacturer || "Manufacturer not set"}
                                                {product.unit ? `  |  ${product.unit}` : ""}
                                            </p>

                                            <div className="mt-2 flex items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-extrabold text-slate-900">
                                                        ₹{product.sellingPrice.toLocaleString("en-IN")}
                                                    </p>
                                                    <p
                                                        className={`mt-0.5 text-[10px] font-semibold ${product.currentStock <= product.minimumStock
                                                            ? "text-red-600"
                                                            : "text-green-700"
                                                            }`}
                                                    >
                                                        Stock: {product.currentStock} {product.unit}
                                                    </p>
                                                </div>

                                                <span className="max-w-[100px] truncate text-[10px] text-slate-400">
                                                    {product.category}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Product action menu */}
                                    <button
                                        type="button"
                                        aria-label={`Actions for ${product.name}`}
                                        onClick={() =>
                                            setMenuId(menuId === product.id ? null : product.id)
                                        }
                                        className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                    >
                                        <MoreVertical size={17} />
                                    </button>

                                    {menuId === product.id && (
                                        <div className="absolute right-3 top-10 z-20 w-44 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl">
                                            <button
                                                type="button"
                                                onClick={() => openEditForm(product)}
                                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-xs font-medium hover:bg-green-50"
                                            >
                                                <Pencil size={15} />
                                                Edit product
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void toggleActive(product)}
                                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-xs font-medium hover:bg-green-50 disabled:opacity-50"
                                            >
                                                <Power size={15} />
                                                {product.active ? "Deactivate" : "Reactivate"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => void removeProduct(product)}
                                                className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-3 text-left text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                <Trash2 size={15} />
                                                Delete product
                                            </button>
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Floating add button */}
            <button
                type="button"
                onClick={openAddForm}
                className="fixed bottom-[72px] right-4 z-30 flex items-center gap-2 rounded-full bg-[#087443] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-900/20 active:scale-95 h-12"
            >
                <Plus size={18} strokeWidth={2.5} />
                <span>Add Product</span>
            </button>


            {/* Add / Edit Product Full Page */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex flex-col bg-[#f4f8f5]">
                    {/* Green page header */}
                    <header className="flex shrink-0 items-center gap-3 bg-[#087443] px-4 py-4 text-white">
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="rounded-lg p-1"
                            aria-label="Go back"
                        >
                            <X size={22} />
                        </button>

                        <div>
                            <h2 className="text-lg font-bold">
                                {editingId ? "Edit Product" : "Add Product"}
                            </h2>
                            <p className="text-xs text-green-100">
                                Enter product and stock details
                            </p>
                        </div>
                    </header>

                    {/* Scrollable form content */}
                    <section className="flex-1 overflow-y-auto p-4 pb-8">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void saveProduct();
                            }}
                            className="space-y-4 rounded-2xl border border-green-100 bg-white p-4 shadow-sm"
                        >
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold">
                                    Product Name *
                                </label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(event) =>
                                        setForm({ ...form, name: event.target.value })
                                    }
                                    placeholder="Enter product name"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold">
                                    Category *
                                </label>
                                <select
                                    value={form.category}
                                    onChange={(event) =>
                                        setForm({ ...form, category: event.target.value })
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-600"
                                >
                                    {categories
                                        .filter((item) => item !== "All")
                                        .concat("Other")
                                        .map((item) => (
                                            <option key={item} value={item}>
                                                {item}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold">
                                    Manufacturer
                                </label>
                                <input
                                    value={form.manufacturer}
                                    onChange={(event) =>
                                        setForm({ ...form, manufacturer: event.target.value })
                                    }
                                    placeholder="Company / brand"
                                    className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold">
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
                                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold">
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
                                        className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-green-600"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-semibold">
                                    Stock Unit
                                </label>
                                <select
                                    value={form.unit}
                                    onChange={(event) =>
                                        setForm({ ...form, unit: event.target.value })
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-green-600"
                                >
                                    {[
                                        "Kg",
                                        "g",
                                        "L",
                                        "ml",
                                        "Packet",
                                        "Piece",
                                        "Bag",
                                        "Box",
                                    ].map((unit) => (
                                        <option key={unit} value={unit}>
                                            {unit}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Form actions */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    disabled={saving}
                                    className="h-12 flex-1 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 disabled:opacity-50"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="h-12 flex-1 rounded-xl bg-[#087443] text-sm font-bold text-white disabled:opacity-60"
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingId
                                            ? "Update Product"
                                            : "Save Product"}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}

export default ProductsMobile;