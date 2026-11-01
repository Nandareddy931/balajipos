
import {
    collection,
    getDocs,
    query,
    where,
    limit,
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    scannedAt?: Date;
    existingStockInId?: string;
}

/**
 * Check if an invoice with the same number has already been saved.
 * Matches on invoiceNumber only.
 */
export const checkDuplicateInvoice = async (
    invoiceNumber: string
): Promise<DuplicateCheckResult> => {
    const trimmed = invoiceNumber.trim();
    if (!trimmed) return { isDuplicate: false };

    const q = query(
        collection(db, "stockIns"),
        where("invoiceNumber", "==", trimmed),
        limit(1)
    );

    const snap = await getDocs(q);

    if (snap.empty) return { isDuplicate: false };

    const existing = snap.docs[0].data();
    return {
        isDuplicate: true,
        existingStockInId: snap.docs[0].id,
        scannedAt: existing.createdAt?.toDate?.() ?? undefined,
    };
};