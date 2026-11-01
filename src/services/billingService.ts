
import {
    collection,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    where,
    writeBatch,
    increment,
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

const getCurrentShopId = (): string => {
    const user = auth.currentUser;

    if (!user) {
        throw new Error("Please log in first.");
    }

    // In our signup architecture, shopId = Firebase Auth UID.
    // This avoids a Firestore read and supports offline billing.
    return user.uid;
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
    const errors = validateBill(bill);

    if (errors.length > 0) {
        throw new Error(errors.join("\n"));
    }

    const shopId = getCurrentShopId();

    // Check duplicate bill number when online.
    if (navigator.onLine) {
        try {
            const exists = await isBillNumberExists(bill.billNumber);

            if (exists) {
                throw new Error(
                    `Bill number ${bill.billNumber} already exists. Please generate a new bill number.`
                );
            }
        } catch (err) {
            if (
                err instanceof Error &&
                err.message.includes("already exists")
            ) {
                throw err;
            }

            console.warn("Duplicate check skipped:", err);
        }
    }

    const batch = writeBatch(db);

    // 1. Create bill document.
    const billRef = doc(collection(db, "bills"));
    const billId = billRef.id;

    batch.set(billRef, {
        ...bill,
        id: billId,
        shopId,
        createdAt: serverTimestamp(),
    });

    // 2. Decrement stock and record movements.
    for (const item of bill.items) {
        const productRef = doc(db, "products", item.productId);

        batch.update(productRef, {
            currentStock: increment(-item.quantity),
            updatedAt: serverTimestamp(),
        });

        const movementRef = doc(collection(db, "stockMovements"));

        batch.set(movementRef, {
            shopId,
            productId: item.productId,
            product: item.productName,
            type: "SALE",
            quantity: -item.quantity,
            unit: item.unit,
            rate: item.sellingPrice,
            amount: item.amount,
            billId,
            billNumber: bill.billNumber,
            customerName: bill.customerName,
            customerPhone: bill.customerPhone,
            movementDate: bill.billDate,
            createdAt: serverTimestamp(),
        });
    }

    // 3. Commit all writes together.
    await batch.commit();

    return billId;
};

// ============================================================
// GET SINGLE BILL
// ============================================================

export const getBillById = async (
    billId: string
): Promise<Bill | null> => {
    const shopId = getCurrentShopId();

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
    const shopId = getCurrentShopId();

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
    const shopId = getCurrentShopId();

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
