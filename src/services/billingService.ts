
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
    runTransaction,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ============================================================
// TYPES
// ============================================================

export interface BillItem {
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    sellingPrice: number;
    amount: number;
}

export type PaymentStatus = "Paid" | "Partial" | "Credit";
export type PaymentMode = "Cash" | "UPI" | "Card" | "Other";

export interface BillData {
    billNumber: string;
    customerName: string;
    customerPhone: string;
    billDate: string;
    items: BillItem[];
    subtotal: number;
    grandTotal: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
    paymentMode?: PaymentMode;
}

export interface Bill extends BillData {
    id: string;
    createdAt?: unknown;
    shopId: string;
}

// ============================================================
// COLLECTION REFERENCE
// ============================================================

const billsCollection = collection(db, "bills");

// ============================================================
// CURRENT SHOP
// ============================================================

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

// ============================================================
// BILL NUMBER
// ============================================================

export const generateBillNumber = (): string => {
    const year = new Date().getFullYear();
    const timestampPart = Date.now().toString().slice(-6);

    return `BRD-${year}-${timestampPart}`;
};

// ============================================================
// VALIDATION
// ============================================================

export const validateBill = (bill: BillData): string[] => {
    const errors: string[] = [];

    if (!bill.billNumber.trim()) {
        errors.push("Bill number is required.");
    }

    if (!bill.customerName.trim()) {
        errors.push("Customer name is required.");
    }

    if (!bill.customerPhone.trim()) {
        errors.push("Customer phone number is required.");
    }

    if (!bill.billDate) {
        errors.push("Bill date is required.");
    }

    if (!bill.items || bill.items.length === 0) {
        errors.push("At least one product is required.");
    }

    if (!Number.isFinite(bill.subtotal) || bill.subtotal < 0) {
        errors.push("Invalid subtotal.");
    }

    if (!Number.isFinite(bill.grandTotal) || bill.grandTotal < 0) {
        errors.push("Invalid grand total.");
    }

    if (
        !Number.isFinite(bill.paidAmount) ||
        bill.paidAmount < 0
    ) {
        errors.push("Invalid paid amount.");
    }

    if (bill.paidAmount > bill.grandTotal) {
        errors.push("Paid amount cannot be greater than grand total.");
    }

    for (const item of bill.items) {
        if (!item.productId) {
            errors.push("Every item must have a product.");
        }

        if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
            errors.push(`Invalid quantity for ${item.productName}.`);
        }

        if (
            !Number.isFinite(item.sellingPrice) ||
            item.sellingPrice < 0
        ) {
            errors.push(`Invalid selling price for ${item.productName}.`);
        }

        if (!Number.isFinite(item.amount) || item.amount < 0) {
            errors.push(`Invalid amount for ${item.productName}.`);
        }
    }

    return errors;
};

// ============================================================
// DUPLICATE BILL NUMBER CHECK
// ============================================================

export const isBillNumberExists = async (
    billNumber: string
): Promise<boolean> => {
    const shopId = getCurrentShopId();

    const billsQuery = query(
        billsCollection,
        where("shopId", "==", shopId),
        where("billNumber", "==", billNumber.trim())
    );

    const snapshot = await getDocs(billsQuery);

    return !snapshot.empty;
};

// ============================================================
// SAVE BILL — OFFLINE FRIENDLY
// ============================================================

export const saveBill = async (
    bill: BillData
): Promise<string> => {
    validateBill(bill);

    const shopId = await getCurrentShopId();

    // Generate a bill document reference.
    const billRef = doc(collection(db, "bills"));
    const billId = billRef.id;

    // Combine repeated product entries before checking stock.
    const groupedItems = new Map<
        string,
        {
            productId: string;
            productName: string;
            quantity: number;
            unit: string;
            amount: number;
        }
    >();

    for (const item of bill.items) {
        const existing = groupedItems.get(item.productId);

        if (existing) {
            existing.quantity += item.quantity;
            existing.amount += item.amount;
        } else {
            groupedItems.set(item.productId, {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unit: item.unit,
                amount: item.amount,
            });
        }
    }

    const items = Array.from(groupedItems.values());

    const productRefs = items.map((item) => ({
        item,
        ref: doc(db, "products", item.productId),
    }));

    const movementRefs = items.map((item) => ({
        item,
        ref: doc(
            db,
            "stockMovements",
            `${billId}_${item.productId}`
        ),
    }));

    await runTransaction(db, async (transaction) => {
        // ----------------------------------
        // STEP 1: READ ALL DOCUMENTS
        // ----------------------------------

        const existingBill = await transaction.get(billRef);

        if (existingBill.exists()) {
            throw new Error("This bill has already been saved.");
        }

        const productSnapshots = [];

        for (const { item, ref } of productRefs) {
            const snapshot = await transaction.get(ref);

            if (!snapshot.exists()) {
                throw new Error(
                    `Product "${item.productName}" no longer exists.`
                );
            }

            const data = snapshot.data();

            if (data.shopId !== shopId) {
                throw new Error(
                    `You do not have access to "${item.productName}".`
                );
            }

            if (data.active === false) {
                throw new Error(
                    `"${item.productName}" is inactive.`
                );
            }

            const currentStock = data.currentStock;

            if (
                typeof currentStock !== "number" ||
                !Number.isFinite(currentStock) ||
                currentStock < 0
            ) {
                throw new Error(
                    `Invalid stock value for "${item.productName}".`
                );
            }

            if (item.quantity > currentStock) {
                throw new Error(
                    `Insufficient stock for ${item.productName}. Available: ${currentStock}, requested: ${item.quantity}.`
                );
            }

            productSnapshots.push({
                item,
                ref,
                currentStock,
            });
        }

        for (const { item, ref } of movementRefs) {
            const movementSnapshot = await transaction.get(ref);

            if (movementSnapshot.exists()) {
                throw new Error(
                    `Stock movement already exists for ${item.productName}.`
                );
            }
        }

        // ----------------------------------
        // STEP 2: WRITE ONLY AFTER ALL READS
        // ----------------------------------

        transaction.set(billRef, {
            ...bill,
            id: billId,
            shopId,
            createdAt: serverTimestamp(),
        });

        for (const {
            item,
            ref,
            currentStock,
        } of productSnapshots) {
            transaction.update(ref, {
                currentStock: currentStock - item.quantity,
                updatedAt: serverTimestamp(),
            });
        }

        for (const { item, ref } of movementRefs) {
            transaction.set(ref, {
                shopId,
                productId: item.productId,
                productName: item.productName,
                type: "SALE",
                quantity: -item.quantity,
                unit: item.unit,
                amount: item.amount,
                billId,
                billNumber: bill.billNumber,
                customerName: bill.customerName,
                customerPhone: bill.customerPhone,
                movementDate: bill.billDate,
                createdAt: serverTimestamp(),
            });
        }
    });

    return billId;
};

// ============================================================
// GET SINGLE BILL
// ============================================================

export const getBillById = async (
    billId: string
): Promise<Bill | null> => {
    const shopId = await getCurrentShopId();

    const billRef = doc(db, "bills", billId);
    const snapshot = await getDoc(billRef);

    if (!snapshot.exists()) {
        return null;
    }

    const data = snapshot.data();

    // Prevent access to another shop's bill.
    if (data.shopId !== shopId) {
        return null;
    }

    return {
        id: snapshot.id,
        ...(data as BillData),
        shopId,
        createdAt: data.createdAt,
    };
};

// ============================================================
// GET ALL BILLS — CURRENT SHOP ONLY
// ============================================================

export const getBills = async (): Promise<Bill[]> => {
    const shopId = await getCurrentShopId();

    const billsQuery = query(
        billsCollection,
        where("shopId", "==", shopId),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(billsQuery);

    return snapshot.docs.map((billDoc) => {
        const data = billDoc.data();

        return {
            id: billDoc.id,
            ...(data as BillData),
            shopId,
            createdAt: data.createdAt,
        };
    });
};

// ============================================================
// SEARCH BILLS BY CUSTOMER PHONE
// ============================================================

export const searchBillsByCustomerPhone = async (
    phone: string
): Promise<Bill[]> => {
    const shopId = await getCurrentShopId();

    const billsQuery = query(
        billsCollection,
        where("shopId", "==", shopId),
        where("customerPhone", "==", phone.trim())
    );

    const snapshot = await getDocs(billsQuery);

    return snapshot.docs.map((billDoc) => {
        const data = billDoc.data();

        return {
            id: billDoc.id,
            ...(data as BillData),
            shopId,
            createdAt: data.createdAt,
        };
    });
};
