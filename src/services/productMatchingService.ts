// src/services/productMatchingService.ts
import type {
    ParsedInvoiceItem,
    ProductMatchResult,
} from "../types/invoice";
import type { Product } from "./productService";

/**
 * Strip pack sizes and normalize for comparison.
 * "Nrich 40kg" → "nrich"
 * "NRICH 40 KG" → "nrich"
 * "Nrich Fertilizer 40kg" → "nrichfertilizer"
 */
const normalizeText = (value: string = ""): string => {
    return value
        .toLowerCase()
        .replace(
            /\b\d+(\.\d+)?\s*(kg|g|gm|gms|ml|l|lt|ltr|lts|kgs|bag|bags|units?|unts|packet|pkt|pcs?|bottle|btl)\b/gi,
            ""
        )
        .replace(/[^a-z0-9]/g, "")
        .trim();
};

/**
 * Compare two names. Returns 0 to 1.
 */
const calculateSimilarity = (a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 1;

    // Containment bonus
    if (a.includes(b) || b.includes(a)) {
        const shorter = Math.min(a.length, b.length);
        const longer = Math.max(a.length, b.length);
        return 0.85 + 0.15 * (shorter / longer);
    }

    // Word overlap
    const aWords = a.match(/[a-z0-9]+/g) ?? [];
    const bWords = b.match(/[a-z0-9]+/g) ?? [];
    if (!aWords.length || !bWords.length) return 0;

    const bSet = new Set(bWords);
    const common = aWords.filter((w) => bSet.has(w));
    return common.length / Math.max(aWords.length, bWords.length);
};

export const matchInvoiceItem = (
    invoiceItem: ParsedInvoiceItem,
    products: Product[]
): ProductMatchResult => {
    const invoiceName = normalizeText(invoiceItem.product);

    let bestProduct: Product | null = null;
    let bestScore = 0;

    console.log("========== MATCHING ==========");
    console.log("Invoice raw:", JSON.stringify(invoiceItem.product));
    console.log("Invoice normalized:", JSON.stringify(invoiceName));
    console.log("Total products:", products.length);

    for (const product of products) {
        if (!product.active) {
            console.log("  ⏭ Skipped (inactive):", product.name);
            continue;
        }

        const productName = normalizeText(product.name);
        const score = Math.min(calculateSimilarity(invoiceName, productName), 1);

        console.log(
            `  "${product.name}" → norm: "${productName}" → score: ${score.toFixed(3)}`
        );

        if (score > bestScore) {
            bestScore = score;
            bestProduct = product;
        }
    }

    console.log(
        `  🏆 BEST: "${bestProduct?.name ?? "NONE"}" (score: ${bestScore.toFixed(3)})`
    );

    if (bestProduct && bestScore >= 0.75) {
        return {
            invoiceItem,
            matchedProduct: bestProduct,
            confidence: "high",
            isNewProduct: false,
        };
    }

    if (bestProduct && bestScore >= 0.5) {
        return {
            invoiceItem,
            matchedProduct: bestProduct,
            confidence: "medium",
            isNewProduct: false,
        };
    }

    return {
        invoiceItem,
        matchedProduct: null,
        confidence: "none",
        isNewProduct: true,
    };
};

export const matchInvoiceItems = (
    items: ParsedInvoiceItem[],
    products: Product[]
): ProductMatchResult[] =>
    items.map((item) => matchInvoiceItem(item, products));