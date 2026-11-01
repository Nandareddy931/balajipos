
import {
    addDoc,
    collection,
    doc,
    getDoc,
    serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

export type StockMovementType = "IN" | "OUT";

export type StockReferenceType =
    | "STOCK_IN"
    | "BILL"
    | "ADJUSTMENT";

export interface StockMovementData {
    productId: string;
    productName: string;
    type: StockMovementType;
    quantity: number;
    referenceType: StockReferenceType;
    referenceId: string;
    referenceNumber?: string;
    createdAt?: unknown;
    shopId?: string;
}

const stockMovementsCollection = collection(
    db,
    "stockMovements"
);

// ============================================================
// CREATE STOCK MOVEMENT — CURRENT SHOP ONLY
// ============================================================

export const createStockMovement = async (
    movement: Omit<StockMovementData, "createdAt" | "shopId">
): Promise<string> => {
    if (!movement.productId) {
        throw new Error("Product ID is required.");
    }

    if (!movement.productName.trim()) {
        throw new Error("Product name is required.");
    }

    if (
        !Number.isFinite(movement.quantity) ||
        movement.quantity <= 0
    ) {
        throw new Error(
            "Stock movement quantity must be greater than zero."
        );
    }

    if (!movement.referenceId) {
        throw new Error("Reference ID is required.");
    }

    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please log in first.");
    }

    // Verify that the product belongs to the logged-in shop.
    const productRef = doc(db, "products", movement.productId);
    const productSnapshot = await getDoc(productRef);

    if (!productSnapshot.exists()) {
        throw new Error("Product not found.");
    }

    if (productSnapshot.data().shopId !== user.uid) {
        throw new Error("This product does not belong to your shop.");
    }

    const movementRef = await addDoc(
        stockMovementsCollection,
        {
            ...movement,
            shopId: user.uid,
            createdAt: serverTimestamp(),
        }
    );

    return movementRef.id;
};
