
import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Package,
    Pencil,
    Power,
} from "lucide-react";

import {
    getProducts,
    addProduct,
    updateProduct,
    deactivateProduct,
    reactivateProduct,
    deleteProduct,
    type Product,
} from "../services/productService";

function Products() {
    const [products, setProducts] = useState<Product[]>([]);
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editingProductId, setEditingProductId] = useState<string | null>(
        null
    );
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        name: "",
        category: "Pesticide",
        manufacturer: "",
        unit: "Kg",
        sellingPrice: 0,
        minimumStock: 0,
    });

    const resetForm = () => {
        setForm({
            name: "",
            category: "Pesticide",
            manufacturer: "",
            unit: "Kg",
            sellingPrice: 0,
            minimumStock: 0,
        });

        setEditingProductId(null);
        setShowForm(false);
    };

    const loadProducts = async () => {
        try {
            setLoading(true);

            const loadedProducts = await getProducts();

            setProducts(loadedProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
            alert("Unable to load products.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleSaveProduct = async () => {
        if (!form.name.trim()) {
            alert("Please enter product name.");
            return;
        }


        if (form.sellingPrice < 0) {
            alert("Selling price cannot be negative.");
            return;
        }

        if (form.minimumStock < 0) {
            alert("Minimum stock cannot be negative.");
            return;
        }

        try {
            setLoading(true);

            const productData = {
                name: form.name.trim(),
                category: form.category,
                manufacturer: form.manufacturer.trim(),
                unit: form.unit || "Kg",
                sellingPrice: form.sellingPrice,
                minimumStock: form.minimumStock,
            };

            if (editingProductId) {
                await updateProduct(editingProductId, productData);

                setProducts((currentProducts) =>
                    currentProducts.map((product) =>
                        product.id === editingProductId
                            ? {
                                ...product,
                                ...productData,
                            }
                            : product
                    )
                );

                alert("Product updated successfully.");
            } else {
                const productId = await addProduct(productData);

                setProducts((currentProducts) => [
                    ...currentProducts,
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
            alert("Unable to save product.");
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (product: Product) => {
        setForm({
            name: product.name,
            category: product.category,
            manufacturer: product.manufacturer || "",
            unit: product.unit || "Kg",
            sellingPrice: product.sellingPrice,
            minimumStock: product.minimumStock,
        });

        setEditingProductId(product.id);
        setShowForm(true);
    };

    const handleDeactivate = async (product: Product) => {
        const confirmed = window.confirm(
            `Deactivate "${product.name}"?\n\nThe product will not be permanently deleted. Existing stock and bills will remain safe.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setLoading(true);

            await deactivateProduct(product.id);

            setProducts((currentProducts) =>
                currentProducts.map((item) =>
                    item.id === product.id
                        ? {
                            ...item,
                            active: false,
                        }
                        : item
                )
            );

            alert("Product deactivated successfully.");
        } catch (error) {
            console.error("Failed to deactivate product:", error);
            alert("Unable to deactivate product.");
        } finally {
            setLoading(false);
        }
    };

    const handleReactivate = async (product: Product) => {
        try {
            setLoading(true);

            await reactivateProduct(product.id);

            setProducts((currentProducts) =>
                currentProducts.map((item) =>
                    item.id === product.id
                        ? {
                            ...item,
                            active: true,
                        }
                        : item
                )
            );

            alert("Product reactivated successfully.");
        } catch (error) {
            console.error("Failed to reactivate product:", error);
            alert("Unable to reactivate product.");
        } finally {
            setLoading(false);
        }
    };
    const handleDeleteProduct = async (product: Product) => {
        const confirmed = window.confirm(
            `Are you sure you want to permanently delete "${product.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setLoading(true);

            await deleteProduct(product.id);

            setProducts((currentProducts) =>
                currentProducts.filter(
                    (currentProduct) => currentProduct.id !== product.id
                )
            );

            alert("Product deleted successfully.");

            resetForm();
        } catch (error) {
            console.error("Failed to delete product:", error);
            alert("Unable to delete product.");
        } finally {
            setLoading(false);
        }
    };
    const filteredProducts = products.filter((product) => {
        const searchText = search.toLowerCase().trim();

        const productName =
            typeof product.name === "string" ? product.name.toLowerCase() : "";

        const category =
            typeof product.category === "string"
                ? product.category.toLowerCase()
                : "";

        const manufacturer =
            typeof product.manufacturer === "string"
                ? product.manufacturer.toLowerCase()
                : "";

        return (
            productName.includes(searchText) ||
            category.includes(searchText) ||
            manufacturer.includes(searchText)
        );
    });

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-green-100 bg-white px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            Products
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Manage products and inventory information
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (showForm) {
                                resetForm();
                            } else {
                                setEditingProductId(null);
                                setShowForm(true);
                            }
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                    >
                        <Plus className="h-4 w-4" />

                        {showForm ? "Close Form" : "Add Product"}
                    </button>
                </div>
            </div>

            <main className="p-6">
                {/* Add / Edit Form */}
                {showForm && (
                    <section className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-800">
                                    {editingProductId
                                        ? "Edit Product"
                                        : "Add Product"}
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {editingProductId
                                        ? "Update product information"
                                        : "Add a new product to your inventory"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {/* Product Name */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-600">
                                    Product Name *
                                </label>

                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Product name"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-600">
                                    Category *
                                </label>

                                <select
                                    value={form.category}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            category: e.target.value,
                                        })
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
                                >
                                    <option>Pesticide</option>
                                    <option>Insecticide</option>
                                    <option>Fungicide</option>
                                    <option>Herbicide</option>
                                    <option>Fertilizer</option>
                                    <option>Seed</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            {/* Manufacturer */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-600">
                                    Manufacturer
                                </label>

                                <input
                                    type="text"
                                    value={form.manufacturer}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            manufacturer: e.target.value,
                                        })
                                    }
                                    placeholder="Company / manufacturer"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                                />
                            </div>

                            {/* Selling Price */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-600">
                                    Selling Price
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.sellingPrice || ""}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            sellingPrice: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    placeholder="0.00"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                                />
                            </div>

                            {/* Minimum Stock */}
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-600">
                                    Minimum Stock
                                </label>

                                <input
                                    type="number"
                                    min="0"
                                    value={form.minimumStock || ""}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            minimumStock: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                    placeholder="0"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-green-500"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    {editingProductId && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const product = products.find(
                                                    (item) => item.id === editingProductId
                                                );

                                                if (product) {
                                                    handleDeleteProduct(product);
                                                }
                                            }}
                                            disabled={loading}
                                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                                        >
                                            Delete Product
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={loading}
                                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleSaveProduct}
                                        disabled={loading}
                                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {loading
                                            ? "Saving..."
                                            : editingProductId
                                                ? "Update Product"
                                                : "Add Product"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Product Table */}
                <section className="rounded-2xl border bg-white shadow-sm">
                    <div className="border-b p-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search products..."
                                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-green-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left text-sm">
                            <thead className="bg-slate-50">
                                <tr className="border-b">
                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Product
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Category
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Manufacturer
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Current Stock
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Minimum Stock
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Status
                                    </th>

                                    <th className="px-5 py-4 font-semibold text-slate-600">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredProducts.map((product) => {
                                    const lowStock =
                                        product.currentStock <= product.minimumStock;

                                    return (
                                        <tr
                                            key={product.id}
                                            className={`border-b last:border-b-0 ${!product.active
                                                ? "bg-slate-50 opacity-70"
                                                : ""
                                                }`}
                                        >
                                            {/* Product */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="rounded-lg bg-green-50 p-2">
                                                        <Package className="h-4 w-4 text-green-600" />
                                                    </div>

                                                    <div>
                                                        <span className="font-medium text-slate-800">
                                                            {product.name}
                                                        </span>

                                                        {!product.active && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                Deactivated
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {product.category}
                                            </td>

                                            {/* Manufacturer */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {product.manufacturer || "-"}
                                            </td>

                                            {/* Current Stock */}
                                            <td className="px-5 py-4">
                                                <span className="font-semibold text-slate-800">
                                                    {product.currentStock}
                                                </span>
                                            </td>

                                            {/* Minimum Stock */}
                                            <td className="px-5 py-4 text-slate-600">
                                                {product.minimumStock}
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                {!product.active ? (
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                                                        Inactive
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${lowStock
                                                            ? "bg-red-50 text-red-600"
                                                            : "bg-green-50 text-green-600"
                                                            }`}
                                                    >
                                                        {lowStock
                                                            ? "Low Stock"
                                                            : "In Stock"}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            startEdit(product)
                                                        }
                                                        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:border-green-300 hover:text-green-600"
                                                        title="Edit product"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>

                                                    {product.active ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeactivate(product)
                                                            }
                                                            className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50"
                                                            title="Deactivate product"
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleReactivate(product)
                                                            }
                                                            className="rounded-lg border border-green-100 p-2 text-green-600 hover:bg-green-50"
                                                            title="Reactivate product"
                                                        >
                                                            <Power className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-5 py-12 text-center text-slate-500"
                                        >
                                            No products found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Products;

