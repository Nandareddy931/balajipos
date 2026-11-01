
import {
    doc,
    getDoc,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

const productsCollectionName = "products";
const stockMovementsCollectionName = "stockMovements";

/**
 * Get the currently logged-in user's shop ID.
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
 * Deduct stock for a saved bill.
 *
 * Only products belonging to the current shop can be updated.
 * The bill ID prevents duplicate stock deductions.
 */
export const deductStockForBill = async (
    billId: string,
    billNumber: string,
    items: {
        productId: string;
        productName: string;
        quantity: number;
    }[]
): Promise<void> => {
    if (!billId) {
        throw new Error("Bill ID is required.");
    }

    if (!billNumber) {
        throw new Error("Bill number is required.");
    }

    if (!items.length) {
        throw new Error("Bill contains no products.");
    }

    const shopId = await getCurrentShopId();

    await runTransaction(db, async (transaction) => {
        const productSnapshots = [];

        // Read and validate products.
        for (const item of items) {
            if (!item.productId) {
                throw new Error(
                    `Product ID missing for ${item.productName}.`
                );
            }

            if (
                !Number.isFinite(item.quantity) ||
                item.quantity <= 0
            ) {
                throw new Error(
                    `Invalid quantity for ${item.productName}.`
                );
            }

            const productRef = doc(
                db,
                productsCollectionName,
                item.productId
            );

            const productSnapshot =
                await transaction.get(productRef);

            if (!productSnapshot.exists()) {
                throw new Error(
                    `Product "${item.productName}" no longer exists.`
                );
            }

            const data = productSnapshot.data();

            // Verify that the product belongs to this shop.
            if (data.shopId !== shopId) {
                throw new Error(
                    `You do not have access to product "${item.productName}".`
                );
            }

            productSnapshots.push({
                item,
                ref: productRef,
                snapshot: productSnapshot,
            });
        }

        // Check duplicate stock movements.
        for (const item of items) {
            const movementRef = doc(
                db,
                stockMovementsCollectionName,
                `${billId}_${item.productId}`
            );

            const movementSnapshot =
                await transaction.get(movementRef);

            if (movementSnapshot.exists()) {
                throw new Error(
                    `Stock for bill ${billNumber} has already been processed.`
                );
            }
        }

        // Validate stock availability before making changes.
        for (const { item, snapshot } of productSnapshots) {
            const data = snapshot.data();

            const currentStock =
                typeof data.currentStock === "number"
                    ? data.currentStock
                    : 0;

            if (item.quantity > currentStock) {
                throw new Error(
                    `Insufficient stock for ${item.productName}. Available: ${currentStock}, requested: ${item.quantity}.`
                );
            }
        }

        // All checks passed. Perform stock updates.
        for (const { item, ref, snapshot } of productSnapshots) {
            const data = snapshot.data();

            const currentStock =
                typeof data.currentStock === "number"
                    ? data.currentStock
                    : 0;

            const newStock = currentStock - item.quantity;

            transaction.update(ref, {
                currentStock: newStock,
                updatedAt: serverTimestamp(),
            });

            const movementRef = doc(
                db,
                stockMovementsCollectionName,
                `${billId}_${item.productId}`
            );

            transaction.set(movementRef, {
                shopId,
                productId: item.productId,
                productName: item.productName,
                type: "OUT",
                quantity: item.quantity,
                referenceType: "BILL",
                referenceId: billId,
                referenceNumber: billNumber,
                createdAt: serverTimestamp(),
            });
        }
    });
};
