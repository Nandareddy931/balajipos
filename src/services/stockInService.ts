
import {
    collection,
    doc,
    getDoc,
    increment,
    serverTimestamp,
    writeBatch,
    type WriteBatch,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

export interface StockInItem {
    productId: string;
    product: string;
    batch: string;
    manufacturingDate?: string;
    expiryDate?: string;
    pack?: string;
    quantity: number;
    rate: number;
}

export interface StockInDetails {
    supplier: string;
    invoiceNumber: string;
    invoiceDate: string;
    billMode: string;
    deliveryDate?: string;
    transport?: string;
    notes?: string;
}

export interface SaveStockInResult {
    stockInId: string;
}

/**
 * Get the current user's shop ID.
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

const calculateItemAmount = (item: StockInItem): number => {
    return item.quantity * item.rate;
};

/**
 * Validate stock-in information.
 */
const validateStockIn = (
    supplierDetails: StockInDetails,
    items: StockInItem[]
): void => {
    if (!supplierDetails.supplier.trim()) {
        throw new Error("Please enter supplier / dealer name.");
    }

    if (!supplierDetails.invoiceNumber.trim()) {
        throw new Error("Please enter invoice number.");
    }

    if (!supplierDetails.invoiceDate) {
        throw new Error("Please select invoice date.");
    }

    if (items.length === 0) {
        throw new Error("Please add at least one product.");
    }

    for (const item of items) {
        if (!item.productId.trim()) {
            throw new Error("Every stock item must have a valid product.");
        }

        if (!item.product.trim()) {
            throw new Error("Every stock item must have a product name.");
        }

        if (!item.batch.trim()) {
            throw new Error(
                `Please enter batch number for ${item.product}.`
            );
        }

        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
            throw new Error(
                `Quantity must be greater than 0 for ${item.product}.`
            );
        }

        if (!Number.isFinite(item.rate) || item.rate <= 0) {
            throw new Error(
                `Rate must be greater than 0 for ${item.product}.`
            );
        }
    }
};

/**
 * Save stock-in information for the current shop.
 */
export const saveStockIn = async (
    supplierDetails: StockInDetails,
    items: StockInItem[]
): Promise<SaveStockInResult> => {
    validateStockIn(supplierDetails, items);

    const shopId = await getCurrentShopId();

    // Verify every product before creating any writes.
    for (const item of items) {
        const productSnapshot = await getDoc(
            doc(db, "products", item.productId)
        );

        if (!productSnapshot.exists()) {
            throw new Error(
                `Product "${item.product}" no longer exists.`
            );
        }

        if (productSnapshot.data().shopId !== shopId) {
            throw new Error(
                `Product "${item.product}" does not belong to your shop.`
            );
        }
    }

    const batch: WriteBatch = writeBatch(db);

    const stockInRef = doc(collection(db, "stockIns"));

    const subtotal = items.reduce(
        (total, item) => total + calculateItemAmount(item),
        0
    );

    // 1. Create stock-in document.
    batch.set(stockInRef, {
        shopId,
        supplier: supplierDetails.supplier.trim(),
        invoiceNumber: supplierDetails.invoiceNumber.trim(),
        invoiceDate: supplierDetails.invoiceDate,
        billMode: supplierDetails.billMode,
        deliveryDate: supplierDetails.deliveryDate ?? "",
        transport: supplierDetails.transport?.trim() ?? "",
        notes: supplierDetails.notes?.trim() ?? "",

        items: items.map((item) => ({
            productId: item.productId,
            product: item.product.trim(),
            batch: item.batch.trim(),
            manufacturingDate: item.manufacturingDate ?? "",
            expiryDate: item.expiryDate ?? "",
            pack: item.pack?.trim() ?? "",
            quantity: item.quantity,
            rate: item.rate,
            amount: calculateItemAmount(item),
        })),

        subtotal,
        grandTotal: subtotal,
        createdAt: serverTimestamp(),
    });

    // 2. Process each stock item.
    for (const item of items) {
        const productRef = doc(
            db,
            "products",
            item.productId
        );

        const movementRef = doc(
            collection(db, "stockMovements")
        );

        // 3. Create stock movement.
        batch.set(movementRef, {
            shopId,
            stockInId: stockInRef.id,
            product: item.product.trim(),
            productId: item.productId,
            batch: item.batch.trim(),
            pack: item.pack?.trim() ?? "",
            type: "STOCK_IN",
            quantity: item.quantity,
            rate: item.rate,
            amount: calculateItemAmount(item),
            invoiceNumber: supplierDetails.invoiceNumber.trim(),
            supplier: supplierDetails.supplier.trim(),
            movementDate: supplierDetails.invoiceDate,
            createdAt: serverTimestamp(),
        });

        // 4. Create or update product batch.
        const normalizedBatch = item.batch
            .trim()
            .replace(/\s+/g, "_");

        const batchId = `${item.productId}_${normalizedBatch}`;

        const productBatchRef = doc(
            db,
            "productBatches",
            batchId
        );

        const existingBatch = await getDoc(productBatchRef);

        if (existingBatch.exists()) {
            // Prevent updating a batch belonging to another shop.
            if (existingBatch.data().shopId !== shopId) {
                throw new Error(
                    `Batch ${item.batch} does not belong to your shop.`
                );
            }

            batch.update(productBatchRef, {
                quantityReceived: increment(item.quantity),
                currentQuantity: increment(item.quantity),
                purchaseRate: item.rate,
                supplier: supplierDetails.supplier.trim(),
                invoiceNumber: supplierDetails.invoiceNumber.trim(),
                updatedAt: serverTimestamp(),
            });
        } else {
            batch.set(productBatchRef, {
                shopId,
                productId: item.productId,
                productName: item.product.trim(),
                batchNumber: item.batch.trim(),

                manufacturingDate: item.manufacturingDate ?? "",
                expiryDate: item.expiryDate ?? "",
                pack: item.pack?.trim() ?? "",

                quantityReceived: item.quantity,
                currentQuantity: item.quantity,

                purchaseRate: item.rate,
                supplier: supplierDetails.supplier.trim(),
                invoiceNumber: supplierDetails.invoiceNumber.trim(),

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }

        // 5. Update total product stock.
        batch.update(productRef, {
            currentStock: increment(item.quantity),
            updatedAt: serverTimestamp(),
        });
    }

    // 6. Commit all operations together.
    await batch.commit();

    console.log("Stock saved successfully:", stockInRef.id);

    return {
        stockInId: stockInRef.id,
    };
};
