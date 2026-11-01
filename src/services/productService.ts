
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

export interface ProductData {
    name: string;
    category: string;
    manufacturer?: string;
    unit: string;
    sellingPrice: number;
    minimumStock: number;
    currentStock: number;
    active: boolean;
}

export interface Product extends ProductData {
    id: string;
}

/**
 * Get the shop ID of the currently logged-in user.
 */
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

/**
 * Verify that a product belongs to the current shop.
 */
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

/**
 * Find a product by name within the current shop.
 */
export const findProductByName = async (
    name: string
): Promise<Product | null> => {
    const shopId = await getCurrentShopId();

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const productDoc of snapshot.docs) {
        const data = productDoc.data() as ProductData;

        const existing = data.name
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

/**
 * Get all products belonging to the current shop.
 */
export const getProducts = async (): Promise<Product[]> => {
    const shopId = await getCurrentShopId();

    const productsQuery = query(
        collection(db, "products"),
        where("shopId", "==", shopId)
    );

    const snapshot = await getDocs(productsQuery);

    return snapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...(productDoc.data() as ProductData),
    }));
};

/**
 * Add a new product to the current shop.
 */
export const addProduct = async (
    product: Omit<ProductData, "currentStock" | "active">
): Promise<string> => {
    const shopId = await getCurrentShopId();

    const productData: ProductData = {
        ...product,
        currentStock: 0,
        active: true,
    };

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

/**
 * Update an existing product.
 */
export const updateProduct = async (
    productId: string,
    updates: Partial<Omit<ProductData, "currentStock">>
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    const productRef = doc(db, "products", productId);

    await updateDoc(productRef, {
        ...updates,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Deactivate a product instead of deleting it.
 */
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

/**
 * Reactivate a previously deactivated product.
 */
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

/**
 * Delete a product belonging to the current shop.
 */
export const deleteProduct = async (
    productId: string
): Promise<void> => {
    const shopId = await getCurrentShopId();

    await verifyProductOwnership(productId, shopId);

    await deleteDoc(doc(db, "products", productId));
};
