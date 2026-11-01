
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ==========================================
// PRODUCT INTERFACES
// ==========================================

export interface ProductData {
    name: string;
    category: string;
    manufacturer?: string;

    // Product identification
    sku?: string;
    barcode?: string;

    // Product details
    unit: string;
    description?: string;
    supplier?: string;

    // Pricing
    purchasePrice?: number;
    sellingPrice: number;
    mrp?: number;
    gstRate?: number;

    // Inventory
    minimumStock: number;
    currentStock: number;
    //image
    imageUrl?: string;

    active: boolean;
}

export interface Product extends ProductData {
    id: string;
}

// Fields entered when creating a product.
// Stock and active status are managed by the service.
export type NewProductData = Omit<
    ProductData,
    "currentStock" | "active"
> & {
    openingStock?: number;
};

// ==========================================
// SHOP MANAGEMENT
// ==========================================

const getCurrentShopId = async (): Promise<string> => {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please log in first.");
    }

    const userSnapshot = await getDoc(
        doc(db, "users", user.uid)
    );

    if (!userSnapshot.exists()) {
        throw new Error("User profile not found.");
    }

    const shopId = userSnapshot.data().shopId;

    if (typeof shopId !== "string" || !shopId) {
        throw new Error("Shop ID not found.");
    }

    return shopId;
};

// ==========================================
// PRODUCT OWNERSHIP
// ==========================================

const verifyProductOwnership = async (
    productId: string,
    shopId: string
): Promise<void> => {
    const productSnapshot = await getDoc(
        doc(db, "products", productId)
    );

    if (
        !productSnapshot.exists() ||
        productSnapshot.data().shopId !== shopId
    ) {
        throw new Error("Product not found in your shop.");
    }
};

// ==========================================
// DATA CLEANING
// ==========================================

// Avoid storing undefined values in Firestore.
const cleanProductData = <T extends Record<string, unknown>>(
    data: T
): Partial<T> => {
    return Object.fromEntries(
        Object.entries(data).filter(
            ([, value]) => value !== undefined
        )
    ) as Partial<T>;
};

const normalizeSku = (value?: string): string =>
    value?.trim().toUpperCase() ?? "";

const normalizeBarcode = (value?: string): string =>
    value?.trim() ?? "";

// ==========================================
// IDENTIFIER DUPLICATE CHECK
// ==========================================

const verifyUniqueIdentifiers = async (
    shopId: string,
    identifiers: {
        sku?: string;
        barcode?: string;
    },
    excludeProductId?: string
): Promise<void> => {
    const sku = normalizeSku(identifiers.sku);
    const barcode = normalizeBarcode(identifiers.barcode);

    if (!sku && !barcode) return;

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    for (const productDoc of snapshot.docs) {
        if (productDoc.id === excludeProductId) continue;

        const existing = productDoc.data();

        if (
            sku &&
            normalizeSku(existing.sku) === sku
        ) {
            throw new Error(
                `SKU "${sku}" is already used by another product.`
            );
        }

        if (
            barcode &&
            normalizeBarcode(existing.barcode) === barcode
        ) {
            throw new Error(
                `Barcode "${barcode}" is already assigned to another product.`
            );
        }
    }
};

// ==========================================
// FIND PRODUCT BY NAME
// ==========================================

export const findProductByName = async (
    name: string
): Promise<Product | null> => {
    const shopId = await getCurrentShopId();

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    const normalized = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");

    for (const productDoc of snapshot.docs) {
        const data = productDoc.data() as ProductData;

        const existing = (data.name || "")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        if (existing === normalized) {
            return {
                id: productDoc.id,
                ...data,
            };
        }
    }

    return null;
};

// ==========================================
// FIND PRODUCT BY BARCODE
// ==========================================

export const findProductByBarcode = async (
    barcode: string
): Promise<Product | null> => {
    const shopId = await getCurrentShopId();
    const normalizedBarcode = normalizeBarcode(barcode);

    if (!normalizedBarcode) return null;

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    for (const productDoc of snapshot.docs) {
        const data = productDoc.data() as ProductData;

        if (
            normalizeBarcode(data.barcode) === normalizedBarcode
        ) {
            return {
                id: productDoc.id,
                ...data,
            };
        }
    }

    return null;
};

// ==========================================
// FIND PRODUCT BY SKU
// ==========================================

export const findProductBySku = async (
    sku: string
): Promise<Product | null> => {
    const shopId = await getCurrentShopId();
    const normalizedSku = normalizeSku(sku);

    if (!normalizedSku) return null;

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    for (const productDoc of snapshot.docs) {
        const data = productDoc.data() as ProductData;

        if (normalizeSku(data.sku) === normalizedSku) {
            return {
                id: productDoc.id,
                ...data,
            };
        }
    }

    return null;
};

// ==========================================
// GET ALL SHOP PRODUCTS
// ==========================================

export const getProducts = async (): Promise<Product[]> => {
    const shopId = await getCurrentShopId();

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    return snapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...productDoc.data(),
    })) as Product[];
};

// ==========================================
// ADD PRODUCT
// ==========================================

export const addProduct = async (
    product: NewProductData
): Promise<string> => {
    const shopId = await getCurrentShopId();

    if (!product.name.trim()) {
        throw new Error("Product name is required.");
    }

    if (!product.category.trim()) {
        throw new Error("Product category is required.");
    }

    if (!product.unit.trim()) {
        throw new Error("Product unit is required.");
    }

    if (product.sellingPrice < 0) {
        throw new Error("Selling price cannot be negative.");
    }
    if (
        product.openingStock !== undefined &&
        (!Number.isFinite(product.openingStock) ||
            product.openingStock < 0)
    ) {
        throw new Error("Opening stock cannot be negative or invalid.");
    }

    if (
        product.purchasePrice !== undefined &&
        product.purchasePrice < 0
    ) {
        throw new Error("Purchase price cannot be negative.");
    }

    if (product.mrp !== undefined && product.mrp < 0) {
        throw new Error("MRP cannot be negative.");
    }

    if (
        product.gstRate !== undefined &&
        (product.gstRate < 0 || product.gstRate > 100)
    ) {
        throw new Error("GST rate must be between 0 and 100.");
    }

    await verifyUniqueIdentifiers(shopId, {
        sku: product.sku,
        barcode: product.barcode,
    });
    const { openingStock = 0 } = product;
    const productData = cleanProductData({
        ...product,
        name: product.name.trim(),
        category: product.category.trim(),
        manufacturer: product.manufacturer?.trim(),
        sku: product.sku?.trim().toUpperCase(),
        barcode: product.barcode?.trim(),
        description: product.description?.trim(),
        supplier: product.supplier?.trim(),
        currentStock: openingStock,
        active: true,
    });

    const productRef = await addDoc(
        collection(db, "products"),
        {
            ...productData,
            shopId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }
    );

    return productRef.id;
};

// ==========================================
// UPDATE PRODUCT
// ==========================================

export const updateProduct = async (
    productId: string,
    updates: Partial<Omit<ProductData, "currentStock">>
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    if (updates.sellingPrice !== undefined &&
        updates.sellingPrice < 0) {
        throw new Error("Selling price cannot be negative.");
    }

    if (
        updates.purchasePrice !== undefined &&
        updates.purchasePrice < 0
    ) {
        throw new Error("Purchase price cannot be negative.");
    }

    if (updates.mrp !== undefined && updates.mrp < 0) {
        throw new Error("MRP cannot be negative.");
    }

    if (
        updates.gstRate !== undefined &&
        (updates.gstRate < 0 || updates.gstRate > 100)
    ) {
        throw new Error("GST rate must be between 0 and 100.");
    }

    await verifyUniqueIdentifiers(
        shopId,
        {
            sku: updates.sku,
            barcode: updates.barcode,
        },
        productId
    );

    const cleanedUpdates = cleanProductData({
        ...updates,
        name: updates.name?.trim(),
        category: updates.category?.trim(),
        manufacturer: updates.manufacturer?.trim(),
        sku: updates.sku?.trim().toUpperCase(),
        barcode: updates.barcode?.trim(),
        description: updates.description?.trim(),
        supplier: updates.supplier?.trim(),
    });

    await updateDoc(doc(db, "products", productId), {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
    });
};

// ==========================================
// DEACTIVATE PRODUCT
// ==========================================

export const deactivateProduct = async (
    productId: string
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    await updateDoc(doc(db, "products", productId), {
        active: false,
        updatedAt: serverTimestamp(),
    });
};

// ==========================================
// REACTIVATE PRODUCT
// ==========================================

export const reactivateProduct = async (
    productId: string
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    await updateDoc(doc(db, "products", productId), {
        active: true,
        updatedAt: serverTimestamp(),
    });
};

// ==========================================
// DELETE PRODUCT
// ==========================================

export const deleteProduct = async (
    productId: string
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    await deleteDoc(doc(db, "products", productId));
};
